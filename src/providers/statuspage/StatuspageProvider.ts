import { ServiceStatus } from '../../core/types';
import { ProviderIdentity, StatusProvider } from '../StatusProvider';
import { mapSummary } from './statuspageMapper';
import { mapHistory } from './historyMapper';

export const historyCacheMs = 30 * 60_000;

export class StatuspageProvider implements StatusProvider {
  readonly id: string;
  readonly displayName: string;
  readonly statusPageUrl: string;
  private historyCache: { data: Record<string, unknown>; fetchedAt: number } | undefined;
  private historyAttemptedAt = -Infinity;

  constructor(identity: ProviderIdentity, private readonly separateIncidents = false, private readonly request: typeof fetch = fetch, private readonly now = Date.now) {
    this.id = identity.id;
    this.displayName = identity.displayName;
    this.statusPageUrl = identity.statusPageUrl;
  }

  async fetchStatus(signal: AbortSignal): Promise<ServiceStatus> {
    const read = async (path: string, requestSignal = signal): Promise<Record<string, unknown>> => {
      const response = await this.request(`${this.statusPageUrl}/api/v2/${path}.json`, { signal: requestSignal, headers: { Accept: 'application/json' } });
      if (!response.ok) { throw new Error(`Status API returned HTTP ${response.status}`); }
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new Error('Invalid status API JSON'); }
      return data as Record<string, unknown>;
    };
    const fetchHistory = async (): Promise<Record<string, unknown> | undefined> => {
      if (!this.separateIncidents && this.now() - this.historyAttemptedAt < historyCacheMs) { return this.historyCache?.data; }
      this.historyAttemptedAt = this.now();
      try {
        // Compatibility feeds supply current incidents and must never use stale cache.
        const data = await read('incidents', this.separateIncidents ? signal : AbortSignal.any([signal, AbortSignal.timeout(3_000)]));
        if (!Array.isArray(data.incidents)) { throw new Error('Unexpected incident history response'); }
        this.historyCache = { data, fetchedAt: this.now() };
        return data;
      } catch (error) {
        if (this.separateIncidents) { throw error; }
        return this.historyCache?.data;
      }
    };
    const [summary, history] = await Promise.all([read('summary'), fetchHistory()]);
    const now = this.now();
    const status = mapSummary(this.separateIncidents ? { ...summary, incidents: history?.incidents } : summary, this, new Date(now).toISOString());
    // Bad historical dates must not hide a valid current status report.
    try {
      status.history = mapHistory(history, this.historyCache?.fetchedAt ?? now);
      status.historyCheckedAt = new Date(this.historyCache?.fetchedAt ?? now).toISOString();
    } catch { /* The graph displays history unavailable. */ }
    return status;
  }
}
