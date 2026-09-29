import { ServiceStatus } from '../../core/types';
import { ProviderIdentity, StatusProvider } from '../StatusProvider';
import { mapSummary } from './statuspageMapper';
import { mapHistory } from './historyMapper';

export class StatuspageProvider implements StatusProvider {
  readonly id: string;
  readonly displayName: string;
  readonly statusPageUrl: string;

  constructor(identity: ProviderIdentity, private readonly separateIncidents = false, private readonly request: typeof fetch = fetch) {
    this.id = identity.id;
    this.displayName = identity.displayName;
    this.statusPageUrl = identity.statusPageUrl;
  }

  async fetchStatus(signal: AbortSignal): Promise<ServiceStatus> {
    const read = async (path: string): Promise<Record<string, unknown>> => {
      const response = await this.request(`${this.statusPageUrl}/api/v2/${path}.json`, { signal, headers: { Accept: 'application/json' } });
      if (!response.ok) { throw new Error(`Status API returned HTTP ${response.status}`); }
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) { throw new Error('Invalid status API JSON'); }
      return data as Record<string, unknown>;
    };
    const [summary, history] = await Promise.all([read('summary'), read('incidents')]);
    const now = Date.now();
    const status = mapSummary(this.separateIncidents ? { ...summary, incidents: history.incidents } : summary, this, new Date(now).toISOString());
    // Bad historical dates must not hide a valid current status report.
    try { status.history = mapHistory(history, now); } catch { /* The graph displays history unavailable. */ }
    return status;
  }
}
