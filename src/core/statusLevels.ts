import { StatusLevel } from './types';

// Unknown must prevent an all-clear, but never hide a reported incident.
export const severity: Record<StatusLevel, number> = {
  Operational: 0, Unknown: 1, Maintenance: 2, Degraded: 3, PartialOutage: 4, MajorOutage: 5
};

export function worstOf(levels: readonly StatusLevel[]): StatusLevel {
  return levels.length === 0 ? 'Unknown' : levels.reduce((worst, level) =>
    severity[level] > severity[worst] ? level : worst, 'Operational');
}

export function isReportedIssue(level: StatusLevel): boolean {
  return severity[level] > severity.Unknown;
}
