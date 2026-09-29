import { ServiceStatus } from '../core/types';
import { StatusProvider } from '../providers/StatusProvider';

export const minimumPollMs = 60_000;

export class StatusPoller {
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly controllers = new Set<AbortController>();
  private readonly listeners = new Set<(statuses: readonly ServiceStatus[]) => void>();
  private providers: readonly StatusProvider[] = [];
  private generation = 0;
  private running: Promise<void> | undefined;
  private lastStarted = -Infinity;
  private disposed = false;
  statuses: readonly ServiceStatus[] = [];

  constructor(private readonly timeoutMs = 10_000, private readonly now = Date.now) {}

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
    this.timer = setInterval(() => { void this.refresh(); }, Math.min(minutes * minimumPollMs, 2_147_483_647));
    void this.refresh();
  }

  refresh(): Promise<void> {
    if (this.disposed) { return Promise.resolve(); }
    if (this.running) { return this.running; }
    if (this.now() - this.lastStarted < minimumPollMs) { return Promise.resolve(); }
    this.lastStarted = this.now();
    const generation = this.generation;
    this.running = this.poll(generation).finally(() => {
      if (generation === this.generation) { this.running = undefined; }
    });
    return this.running;
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
      this.controllers.delete(controller);
    }
  }

  private unknown(provider: StatusProvider, error: string, checkedAt = new Date(this.now()).toISOString()): ServiceStatus {
    return { providerId: provider.id, displayName: provider.displayName, level: 'Unknown', affectedComponents: [], incidents: [], checkedAt, error };
  }
  private emit(): void { for (const listener of this.listeners) { listener(this.statuses); } }
  private cancel(): void {
    clearInterval(this.timer);
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
