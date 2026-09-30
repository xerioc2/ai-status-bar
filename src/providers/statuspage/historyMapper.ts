import { HistoryDay } from '../../core/types';
import { reportedIncidentLevel, worstOf } from '../../core/statusLevels';
import { mapImpact, mapStage } from './statuspageMapper';

const dayMs = 86_400_000;
const date = (value: unknown): number => typeof value === 'string' ? Date.parse(value) : NaN;

export function mapHistory(raw: unknown, now: number, days = 30): HistoryDay[] {
  if (!raw || typeof raw !== 'object' || !('incidents' in raw) || !Array.isArray(raw.incidents)) {
    throw new Error('Unexpected incident history response');
  }
  const periods = raw.incidents.map((value: unknown) => {
    if (!value || typeof value !== 'object') { throw new Error('Invalid history incident'); }
    const item = value as Record<string, unknown>;
    const published = Array.isArray(item.incident_updates) ? item.incident_updates.map(update =>
      date(update?.display_at ?? update?.created_at)).filter(Number.isFinite) : [];
    // Migrated incidents can have a creation date later than their published updates.
    const start = Math.min(...[date(item.started_at ?? item.created_at), ...published].filter(Number.isFinite));
    const end = mapStage(item.status) === 'Resolved' ? date(item.resolved_at) : now;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      throw new Error('Incident history has missing or invalid dates');
    }
    const impact = mapImpact(item.impact);
    return { start, end, level: reportedIncidentLevel(impact),
      title: typeof item.name === 'string' ? item.name : 'Untitled reported incident' };
  });
  const earliest = Math.min(...periods.map(period => period.start));
  const today = Math.floor(now / dayMs) * dayMs;
  return Array.from({ length: days }, (_, index) => {
    const start = today - (days - index - 1) * dayMs;
    const matches = periods.filter(period => period.start <= now && period.start < start + dayMs &&
      (period.end > start || period.start === period.end && period.start >= start));
    return {
      date: new Date(start).toISOString().slice(0, 10),
      level: matches.length ? worstOf(matches.map(period => period.level)) : start >= earliest ? 'Operational' : 'Unknown',
      incidents: matches.map(period => period.title)
    };
  });
}
