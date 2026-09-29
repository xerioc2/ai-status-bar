import { ServiceStatus } from '../core/types';

export interface ProviderIdentity {
  id: string;
  displayName: string;
  statusPageUrl: string;
}

export interface StatusProvider extends ProviderIdentity {
  fetchStatus(signal: AbortSignal): Promise<ServiceStatus>;
}
