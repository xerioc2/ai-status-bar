import * as assert from 'assert';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mapComponentLevel, mapImpact, mapStage, mapSummary } from '../src/providers/statuspage/statuspageMapper';
import { providerDefinitions } from '../src/providers/registry';

const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, '../../test/fixtures', name + '.json'), 'utf8'));
const provider = { id: 'test', displayName: 'Test', statusPageUrl: 'https://example.com' };
const checkedAt = '2026-09-28T12:00:00Z';
const summary = (overrides = {}) => ({ components: [], incidents: [], status: { indicator: 'none' }, ...overrides });

suite('Statuspage mapper', () => {
  for (const definition of providerDefinitions) {
    test(`maps the real ${definition.id} response without mutating it`, () => {
      const raw = fixture(definition.id);
      if (definition.platform === 'incidentio') { raw.incidents = fixture(definition.id + '-all').incidents; }
      const before = JSON.stringify(raw);
      const result = mapSummary(raw, definition, checkedAt);
      assert.strictEqual(result.level, 'Operational');
      assert.strictEqual(result.incidents.length, 0);
      assert.strictEqual(result.providerId, definition.id);
      assert.strictEqual(JSON.stringify(raw), before);
    });
  }
  test('maps every component level including unexpected values', () => {
    for (const [raw, level] of Object.entries({ operational: 'Operational', degraded_performance: 'Degraded', partial_outage: 'PartialOutage', major_outage: 'MajorOutage', under_maintenance: 'Maintenance', surprise: 'Unknown', constructor: 'Unknown' })) {
      assert.strictEqual(mapComponentLevel(raw), level);
      assert.strictEqual(mapSummary(summary({ components: [{ name: 'API', status: raw }] }), provider, checkedAt).level, level);
    }
  });
  test('maps all impacts and stages independently', () => {
    for (const [raw, level] of Object.entries({ none: 'Operational', minor: 'Degraded', major: 'PartialOutage', critical: 'MajorOutage', maintenance: 'Maintenance', unexpected: 'Unknown' })) {
      assert.strictEqual(mapImpact(raw), level);
    }
    for (const [raw, stage] of Object.entries({ investigating: 'Investigating', identified: 'Identified', monitoring: 'Monitoring', resolved: 'Resolved', postmortem: 'Resolved', scheduled: 'Investigating', in_progress: 'Identified', verifying: 'Monitoring', completed: 'Resolved', unexpected: 'Investigating' })) {
      assert.strictEqual(mapStage(raw), stage);
    }
  });
  test('synthetic fixture covers all levels and stages', () => {
    const raw = fixture('synthetic');
    const result = mapSummary(raw, provider, checkedAt);
    assert.strictEqual(result.level, 'MajorOutage');
    assert.deepStrictEqual(result.incidents.map(i => i.stage), ['Investigating', 'Identified', 'Monitoring', 'Investigating']);
    assert.strictEqual(result.incidents[3].impact, 'Unknown');
    assert.strictEqual(result.affectedComponents.length, 5);
  });
  test('latest update uses published timestamp instead of API ordering', () => {
    const result = mapSummary(summary({ incidents: [{ id: 'a', name: 'Errors', status: 'monitoring', impact: 'major', incident_updates: [
      { body: 'Earlier', display_at: '2026-09-27T12:00:00Z' }, { body: 'Latest', display_at: checkedAt }
    ] }] }), provider, checkedAt);
    assert.strictEqual(result.level, 'PartialOutage');
    assert.strictEqual(result.incidents[0].stage, 'Monitoring');
    assert.strictEqual(result.incidents[0].latestUpdate, 'Latest');
    assert.strictEqual(result.incidents[0].url, 'https://example.com/incidents/a');
  });
  test('future maintenance is ignored, active maintenance is shown', () => {
    const raw = summary({ scheduled_maintenances: [{ status: 'scheduled' }, { status: 'in_progress', name: 'Upgrade' }, { status: 'completed' }] });
    const result = mapSummary(raw, provider, checkedAt);
    assert.strictEqual(result.level, 'Maintenance');
    assert.strictEqual(result.incidents.length, 1);
  });
  test('malformed payload fails closed; unexpected values are safe', () => {
    for (const value of [null, {}, [], '<html>', summary({ incidents: null })]) {
      assert.throws(() => mapSummary(value, provider, checkedAt), /Unexpected/);
    }
    assert.strictEqual(mapSummary(summary({ components: [null], incidents: [null] }), provider, checkedAt).level, 'Unknown');
    assert.strictEqual(mapSummary(summary({ incidents: [{ status: 'investigating', impact: 'none' }] }), provider, checkedAt).level, 'Degraded');
  });
});
