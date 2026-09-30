import * as assert from 'assert';
import { isReportedIssue, reportedIncidentLevel, severity, worstOf } from '../src/core/statusLevels';
import { StatusLevel } from '../src/core/types';

suite('Severity', () => {
  test('reported incidents promote only Operational to Degraded', () => {
    for (const level of Object.keys(severity) as StatusLevel[]) {
      assert.strictEqual(reportedIncidentLevel(level), level === 'Operational' ? 'Degraded' : level);
    }
  });
  test('empty and incomplete coverage cannot claim all clear', () => {
    assert.strictEqual(worstOf([]), 'Unknown');
    assert.strictEqual(worstOf(['Operational', 'Unknown']), 'Unknown');
    assert.strictEqual(isReportedIssue('Unknown'), false);
  });
  test('all pairwise orderings are stable and issues outrank unknown', () => {
    const expected: StatusLevel[] = ['Operational', 'Unknown', 'Maintenance', 'Degraded', 'PartialOutage', 'MajorOutage'];
    assert.deepStrictEqual(Object.keys(severity).sort((a, b) => severity[a as StatusLevel] - severity[b as StatusLevel]), expected);
    expected.forEach((a, i) => expected.forEach((b, j) => assert.strictEqual(worstOf([a, b]), expected[Math.max(i, j)])));
  });
});
