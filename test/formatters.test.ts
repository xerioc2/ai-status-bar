import * as assert from 'assert';
import { ServiceStatus, StatusLevel } from '../src/core/types';
import { formatBar, providerText, relativeTime } from '../src/ui/formatters';

const status = (level: StatusLevel): ServiceStatus => ({ providerId: 'a', displayName: 'Example', level, incidents: [], affectedComponents: [], checkedAt: '2026-09-28T12:00:00Z' });
suite('Formatters', () => {
  test('clear, mixed unknown, all unknown, and empty states', () => {
    assert.strictEqual(formatBar([status('Operational')]).text, '$(check) AI');
    for (const values of [[], [status('Unknown')], [status('Operational'), status('Unknown')]]) {
      assert.deepStrictEqual(formatBar(values), { text: '$(question) AI', background: undefined });
    }
  });
  test('counts affected providers, excludes unknown, and uses worst color', () => {
    assert.deepStrictEqual(formatBar([status('Maintenance'), status('PartialOutage'), status('Unknown')]), { text: '$(warning) AI: 2', background: 'statusBarItem.warningBackground' });
    assert.deepStrictEqual(formatBar([status('MajorOutage'), status('Degraded')]), { text: '$(error) AI: 2', background: 'statusBarItem.errorBackground' });
  });
  test('tooltip retains severity, stage, latest text, and last checked', () => {
    const item = status('PartialOutage');
    item.incidents = [{ title: 'File errors', impact: 'PartialOutage', stage: 'Identified', latestUpdate: 'Fix being prepared', updatedAt: '2026-09-28T11:48:00Z', url: 'https://example.com' }];
    const text = providerText(item, Date.parse(item.checkedAt));
    assert.match(text, /Partial outage — Identified: "File errors"/);
    assert.match(text, /Fix being prepared \(updated 12 min ago\)/);
    assert.match(text, /Last checked:/);
    assert.match(providerText(status('Operational'), 0), /No reported incidents/);
  });
  test('relative times tolerate malformed and future timestamps', () => {
    assert.strictEqual(relativeTime('bad', 0), 'time unavailable');
    assert.strictEqual(relativeTime('2026-09-28', 0), 'just now');
  });
});
