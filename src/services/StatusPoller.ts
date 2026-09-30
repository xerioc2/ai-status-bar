import { ServiceStatus } from '../core/types';
import { StatusProvider } from '../providers/StatusProvider';

export const minimumPollMs = 60_000;
export interface PollScheduler {
  set(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clear(timer: ReturnType<typeof setTimeout> | undefined): void;
}
const defaultScheduler: PollScheduler = { set: (callback, delay) => setTimeout(callback, delay), clear: timer => clearTimeout(timer) };

export class StatusPoller {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private intervalMs = 3 * minimumPollMs;
  private readonly controllers = new Set<AbortController>();
  private readonly listeners = new Set<(statuses: readonly ServiceStatus[]) => void>();
  private providers: readonly StatusProvider[] = [];
  private generation = 0;
  private running: Promise<void> | undefined;
  private lastStarted = -Infinity;
  private disposed = false;
  statuses: readonly ServiceStatus[] = [];

  constructor(private readonly timeoutMs = 10_000, private readonly now = Date.now, private readonly scheduler: PollScheduler = defaultScheduler) {}

  onUpdate(listener: (statuses: readonly ServiceStatus[]) => void): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => { this.listeners.delete(listener); } };
  }

  configure(providers: readonly StatusProvider[], intervalMinutes: number): void {
    if (this.disposed) { return; }
    this.generation++;
    this.cancel();
    this.providers = providers;
    this.running = undefined;
    this.statuses = providers.map(provider => this.statuses.find(status => status.providerId === provider.id)
      ?? this.unknown(provider, 'Waiting for first check', ''));
    this.emit();
    const minutes = Number.isFinite(intervalMinutes) ? Math.max(1, intervalMinutes) : 3;
    this.intervalMs = Math.min(minutes * minimumPollMs, 2_147_483_647);
    void this.refresh();
  }

  refresh(): Promise<void> {
    if (this.disposed || !this.providers.length) { return Promise.resolve(); }
    if (this.running) { return this.running; }
    const remaining = this.lastStarted + minimumPollMs - this.now();
    if (remaining > 0) {
      this.schedule(remaining);
      return Promise.resolve();
    }
    this.scheduler.clear(this.timer);
    this.lastStarted = this.now();
    const generation = this.generation;
    this.running = this.poll(generation).finally(() => {
      if (generation === this.generation && !this.disposed) {
        this.running = undefined;
        this.schedule(Math.max(0, this.lastStarted + this.intervalMs - this.now()));
      }
    });
    return this.running;
  }

  private schedule(delay: number): void {
    this.scheduler.clear(this.timer);
    this.timer = this.scheduler.set(() => { void this.refresh(); }, delay);
  }

  private async poll(generation: number): Promise<void> {
    const providers = this.providers;
    const results = await Promise.allSettled(providers.map(provider => this.check(provider)));
    if (this.disposed || generation !== this.generation) { return; }
    this.statuses = results.map((result, index) => result.status === 'fulfilled' ? result.value :
      this.unknown(providers[index], result.reason instanceof Error ? result.reason.message : 'Could not reach status API'));
    this.emit();
  }

  private async check(provider: StatusProvider): Promise<ServiceStatus> {
    const controller = new AbortController();
    this.controllers.add(controller);
    // Race as well as abort: a future adapter must not stall every provider by ignoring cancellation.
    let rejectAbort: () => void = () => {};
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new Error('Status request timed out or was cancelled'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try { return await Promise.race([provider.fetchStatus(controller.signal), aborted]); }
    finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener('abort', rejectAbort);
      // A rejected adapter may still have sibling requests bound to this signal.
      controller.abort();
      this.controllers.delete(controller);
    }
  }

  private unknown(provider: StatusProvider, error: string, checkedAt = new Date(this.now()).toISOString()): ServiceStatus {
    return { providerId: provider.id, displayName: provider.displayName, level: 'Unknown', affectedComponents: [], incidents: [], checkedAt, error };
  }
  private emit(): void { for (const listener of this.listeners) { listener(this.statuses); } }
  private cancel(): void {
    this.scheduler.clear(this.timer);
    for (const controller of this.controllers) { controller.abort(); }
    this.controllers.clear();
  }
  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.cancel();
    this.listeners.clear();
  }
}
