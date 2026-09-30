import { Incident, IncidentStage, ServiceStatus, StatusLevel } from '../../core/types';
import { reportedIncidentLevel, worstOf } from '../../core/statusLevels';
import { ProviderIdentity } from '../StatusProvider';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const string = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const componentLevels: Record<string, StatusLevel> = {
  operational: 'Operational', degraded_performance: 'Degraded', partial_outage: 'PartialOutage',
  major_outage: 'MajorOutage', under_maintenance: 'Maintenance'
};
const impactLevels: Record<string, StatusLevel> = {
  none: 'Operational', minor: 'Degraded', major: 'PartialOutage', critical: 'MajorOutage', maintenance: 'Maintenance'
};
const stages: Record<string, IncidentStage> = {
  investigating: 'Investigating', identified: 'Identified', monitoring: 'Monitoring',
  resolved: 'Resolved', postmortem: 'Resolved', completed: 'Resolved',
  scheduled: 'Investigating', in_progress: 'Identified', verifying: 'Monitoring'
};
// Own-property lookup also handles unexpected values like "constructor" safely.
function lookup<T>(map: Record<string, T>, value: unknown, fallback: T): T {
  const key = string(value);
  return Object.hasOwn(map, key) ? map[key] : fallback;
}
export const mapComponentLevel = (value: unknown): StatusLevel => lookup(componentLevels, value, 'Unknown');
export const mapImpact = (value: unknown): StatusLevel => lookup(impactLevels, value, 'Unknown');
export const mapStage = (value: unknown): IncidentStage => lookup(stages, value, 'Investigating');

function timestamp(value: unknown): number {
  return Date.parse(string(value)) || 0;
}

function incident(raw: unknown, provider: ProviderIdentity, maintenance = false): Incident {
  const item = object(raw);
  const updates = array(item.incident_updates).map(object);
  const latest = updates.reduce<JsonObject>((a, b) =>
    timestamp(b.display_at ?? b.updated_at ?? b.created_at) > timestamp(a.display_at ?? a.updated_at ?? a.created_at) ? b : a, updates[0] ?? {});
  const knownStage = Object.hasOwn(stages, string(item.status));
  return {
    title: string(item.name, 'Untitled reported incident'),
    stage: mapStage(item.status),
    impact: !knownStage ? 'Unknown' : maintenance ? 'Maintenance' : mapImpact(item.impact),
    latestUpdate: string(latest.body, 'No update text published.'),
    updatedAt: string(latest.display_at ?? latest.updated_at ?? item.updated_at),
    url: string(item.shortlink, `${provider.statusPageUrl}/incidents/${encodeURIComponent(string(item.id))}`)
  };
}

export function mapSummary(raw: unknown, provider: ProviderIdentity, checkedAt: string): ServiceStatus {
  const data = object(raw);
  if (!Array.isArray(data.components) || !Array.isArray(data.incidents) || typeof object(data.status).indicator !== 'string') {
    throw new Error('Unexpected status API response');
  }
  const components = data.components.map(rawComponent => {
    const component = object(rawComponent);
    return { name: string(component.name, 'Unnamed component'), level: mapComponentLevel(component.status) };
  });
  const incidents = data.incidents.map(value => incident(value, provider)).filter(value => value.stage !== 'Resolved');
  const maintenance = array(data.scheduled_maintenances)
    .filter(value => !['scheduled', 'completed', 'resolved'].includes(string(object(value).status)))
    .map(value => incident(value, provider, true));
  const active = [...incidents, ...maintenance];
  // An active incident with unspecified impact still deserves attention.
  const incidentLevels = active.map(value => reportedIncidentLevel(value.impact));
  const level = worstOf([mapImpact(object(data.status).indicator), ...components.map(c => c.level), ...incidentLevels]);
  return {
    providerId: provider.id, displayName: provider.displayName, level,
    affectedComponents: components.filter(c => c.level !== 'Operational'), incidents: active, checkedAt
  };
}
