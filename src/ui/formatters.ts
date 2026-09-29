import { IncidentStage, ServiceStatus, StatusLevel } from '../core/types';
import { isReportedIssue, worstOf } from '../core/statusLevels';

const warning = 'statusBarItem.warningBackground';
export const levelPresentation: Record<StatusLevel, { icon: string; label: string; background?: string; chartColor: string }> = {
  Operational: { icon: 'check', label: 'No reported incidents', chartColor: '#20bfa5' },
  Unknown: { icon: 'question', label: 'Unknown', chartColor: 'var(--vscode-disabledForeground)' },
  Maintenance: { icon: 'warning', label: 'Maintenance', background: warning, chartColor: '#699bea' },
  Degraded: { icon: 'warning', label: 'Degraded', background: warning, chartColor: '#e9bd35' },
  PartialOutage: { icon: 'warning', label: 'Partial outage', background: warning, chartColor: '#ee9149' },
  MajorOutage: { icon: 'error', label: 'Major outage', background: 'statusBarItem.errorBackground', chartColor: '#ef6464' }
};
export const stageLabels: Record<IncidentStage, string> = {
  Investigating: 'Investigating', Identified: 'Identified', Monitoring: 'Monitoring', Resolved: 'Resolved'
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
    lines.push(`${levelPresentation[incident.impact].label} — ${stageLabels[incident.stage]}: "${incident.title}" — ${incident.latestUpdate} (updated ${relativeTime(incident.updatedAt, now)})`);
  }
  if (status.affectedComponents.length) {
    lines.push(status.affectedComponents.map(c => `${c.name}: ${levelPresentation[c.level].label}`).join('; '));
  }
  if (status.error) { lines.push(status.error); }
  lines.push(`Last checked: ${status.checkedAt ? new Date(status.checkedAt).toLocaleString() : 'Not yet checked'}`);
  return lines.join('\n');
}
