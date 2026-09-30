import { ServiceStatus } from '../core/types';

export interface ProviderIdentity {
  id: string;
  displayName: string;
  statusPageUrl: string;
}

// 'statuspage': Atlassian Statuspage, whose summary includes active incidents.
// 'incidentio': incident.io's Statuspage-compatible API, whose incidents come only from incidents.json.
export type StatusPlatform = 'statuspage' | 'incidentio';

export interface ProviderDefinition extends ProviderIdentity {
  platform: StatusPlatform;
}

export interface StatusProvider extends ProviderIdentity {
  fetchStatus(signal: AbortSignal): Promise<ServiceStatus>;
}
