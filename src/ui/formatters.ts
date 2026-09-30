import { ServiceStatus, StatusLevel } from '../core/types';
import { isReportedIssue, worstOf } from '../core/statusLevels';

const warning = 'statusBarItem.warningBackground';
// Chart colors live in resources/styles.css, keyed by the same level names.
export const levelPresentation: Record<StatusLevel, { icon: string; label: string; background?: string }> = {
  Operational: { icon: 'check', label: 'No reported incidents' },
  Unknown: { icon: 'question', label: 'Unknown' },
  Maintenance: { icon: 'warning', label: 'Maintenance', background: warning },
  Degraded: { icon: 'warning', label: 'Degraded', background: warning },
  PartialOutage: { icon: 'warning', label: 'Partial outage', background: warning },
  MajorOutage: { icon: 'error', label: 'Major outage', background: 'statusBarItem.errorBackground' }
};

export function formatBar(statuses: readonly ServiceStatus[]): { text: string; background?: string } {
  const presentation = levelPresentation[worstOf(statuses.map(s => s.level))];
  const count = statuses.filter(s => isReportedIssue(s.level)).length;
  return { text: `$(${presentation.icon}) AI${count ? `: ${count}` : ''}`, background: presentation.background };
}

export function relativeTime(date: string, now: number): string {
  const time = Date.parse(date);
  if (!Number.isFinite(time)) { return 'time unavailable'; }
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  return minutes === 0 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
}

export function providerText(status: ServiceStatus, now: number): string {
  const lines = [`${status.displayName}: ${levelPresentation[status.level].label}`];
  for (const incident of status.incidents) {
    lines.push(`${levelPresentation[incident.impact].label} — ${incident.stage}: "${incident.title}" — ${incident.latestUpdate} (updated ${relativeTime(incident.updatedAt, now)})`);
  }
  if (status.affectedComponents.length) {
    lines.push(status.affectedComponents.map(c => `${c.name}: ${levelPresentation[c.level].label}`).join('; '));
  }
  if (status.error) { lines.push(status.error); }
  lines.push(`Last checked: ${status.checkedAt ? new Date(status.checkedAt).toLocaleString() : 'Not yet checked'}`);
  return lines.join('\n');
}
