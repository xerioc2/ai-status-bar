import * as assert from 'assert';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mapHistory } from '../src/providers/statuspage/historyMapper';
import { providerDefinitions } from '../src/providers/registry';

const now = Date.parse('2026-09-28T12:00:00Z');
suite('Incident history', () => {
  for (const provider of providerDefinitions) {
    test(`maps real ${provider.id} history into 30 dated bars`, () => {
      const raw = JSON.parse(readFileSync(resolve(__dirname, '../../test/fixtures', `${provider.id}-all.json`), 'utf8'));
      const result = mapHistory(raw, now);
      assert.strictEqual(result.length, 30);
      assert.strictEqual(result[0].date, '2026-08-30');
      assert.strictEqual(result[29].date, '2026-09-28');
      assert.ok(result.some(day => day.incidents.length > 0));
    });
  }
  test('overlaps, multi-day incidents, ongoing incidents, and missing coverage', () => {
    const result = mapHistory({ incidents: [
      { name: 'Slow', status: 'resolved', impact: 'minor', created_at: '2026-09-25T22:00:00Z', resolved_at: '2026-09-27T01:00:00Z' },
      { name: 'Outage', status: 'monitoring', impact: 'critical', created_at: '2026-09-26T10:00:00Z' }
    ] }, now, 5);
    assert.deepStrictEqual(result.map(day => day.level), ['Unknown', 'Degraded', 'MajorOutage', 'MajorOutage', 'MajorOutage']);
    assert.deepStrictEqual(result[2].incidents, ['Slow', 'Outage']);
  });
  test('empty feeds never invent green history; invalid dates fail closed', () => {
    assert.ok(mapHistory({ incidents: [] }, now).every(day => day.level === 'Unknown'));
    assert.throws(() => mapHistory({}, now));
    assert.throws(() => mapHistory({ incidents: [{ status: 'resolved', created_at: 'bad' }] }, now));
  });
  test('uses published dates for migrated incidents', () => {
    const result = mapHistory({ incidents: [{ name: 'Migrated', impact: 'minor', status: 'resolved', created_at: '2026-09-28', resolved_at: '2026-09-27', incident_updates: [{ display_at: '2026-09-26' }] }] }, now, 3);
    assert.strictEqual(result[0].level, 'Degraded');
    assert.strictEqual(result[2].level, 'Operational');
  });
  test('resolution at midnight does not mark the following day; unexpected impact is unknown', () => {
    const result = mapHistory({ incidents: [{ name: 'Brief incident', impact: 'new-value', status: 'resolved', created_at: '2026-09-26T23:00:00Z', resolved_at: '2026-09-27T00:00:00Z' }] }, now, 3);
    assert.strictEqual(result[0].level, 'Unknown');
    assert.strictEqual(result[1].level, 'Operational');
  });
});
