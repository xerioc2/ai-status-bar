import { ServiceStatus } from '../../core/types';
import { ProviderDefinition, StatusProvider } from '../StatusProvider';
import { mapSummary } from './statuspageMapper';
import { mapHistory } from './historyMapper';

type Json = Record<string, unknown>;

export const historyCacheMs = 30 * 60_000;
export const historyRetryMs = 5 * 60_000;
const optionalHistoryTimeoutMs = 3_000;

// Reads both Atlassian Statuspage and incident.io's Statuspage-compatible API.
export class StatuspageProvider implements StatusProvider {
  readonly id: string;
  readonly displayName: string;
  readonly statusPageUrl: string;
  // incident.io publishes active incidents only in incidents.json, so that feed is required and never cached.
  private readonly historyRequired: boolean;
  private history: { data: Json; fetchedAt: number } | undefined;
  private nextHistoryAt = -Infinity;

  constructor(definition: ProviderDefinition, private readonly request: typeof fetch = fetch, private readonly now = Date.now) {
    this.id = definition.id;
    this.displayName = definition.displayName;
    this.statusPageUrl = definition.statusPageUrl;
    this.historyRequired = definition.platform === 'incidentio';
  }

  async fetchStatus(signal: AbortSignal): Promise<ServiceStatus> {
    const [summary, history] = await Promise.all([this.read('summary', signal), this.fetchHistory(signal)]);
    const now = this.now();
    const status = mapSummary(this.historyRequired ? { ...summary, incidents: history?.incidents } : summary, this, new Date(now).toISOString());
    // Bad historical dates must not hide a valid current status report.
    try {
      const fetchedAt = this.history?.fetchedAt ?? now;
      status.history = mapHistory(history, fetchedAt);
      status.historyCheckedAt = new Date(fetchedAt).toISOString();
    } catch { /* The graph displays history unavailable. */ }
    return status;
  }

  private async fetchHistory(signal: AbortSignal): Promise<Json | undefined> {
    if (this.historyRequired) { return this.readHistory(signal); }
    if (this.now() < this.nextHistoryAt) { return this.history?.data; }
    try {
      // Optional history gets a short timeout so it cannot delay the current status.
      const data = await this.readHistory(AbortSignal.any([signal, AbortSignal.timeout(optionalHistoryTimeoutMs)]));
      this.nextHistoryAt = this.now() + historyCacheMs;
      return data;
    } catch {
      // Cancellation is not a feed failure; retry on the next check.
      if (!signal.aborted) { this.nextHistoryAt = this.now() + historyRetryMs; }
      return this.history?.data;
    }
  }

  private async readHistory(signal: AbortSignal): Promise<Json> {
    const data = await this.read('incidents', signal);
    if (!Array.isArray(data.incidents)) { throw new Error('Unexpected incident history response'); }
    this.history = { data, fetchedAt: this.now() };
    return data;
  }

  private async read(path: string, signal: AbortSignal): Promise<Json> {
    const response = await this.request(`${this.statusPageUrl}/api/v2/${path}.json`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) { throw new Error(`Status API returned HTTP ${response.status}`); }
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new Error('Invalid status API JSON'); }
    return data as Json;
  }
}
