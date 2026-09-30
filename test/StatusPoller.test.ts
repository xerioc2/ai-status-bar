import * as assert from 'assert';
import { StatusPoller } from '../src/services/StatusPoller';
import { StatusProvider } from '../src/providers/StatusProvider';
import { ServiceStatus } from '../src/core/types';

const good: ServiceStatus = { providerId: 'ok', displayName: 'OK', level: 'Operational', affectedComponents: [], incidents: [], checkedAt: '2026-09-28T12:00:00Z' };
const provider = (id: string, fetchStatus: StatusProvider['fetchStatus']): StatusProvider => ({ id, displayName: id, statusPageUrl: 'https://example.com', fetchStatus });

suite('StatusPoller', () => {
  test('early rejection aborts sibling work before the cycle is forgotten', async () => {
    const poller = new StatusPoller(1000);
    let pending = 0;
    let aborts = 0;
    const failing = provider('siblings', async signal => {
      const sibling = new Promise<never>((_, reject) => {
        pending++;
        signal.addEventListener('abort', () => {
          pending--;
          aborts++;
          reject(new Error('Sibling cancelled'));
        }, { once: true });
      });
      await Promise.all([Promise.reject(new Error('First request failed')), sibling]);
      return good;
    });
    try {
      poller.configure([failing], 3);
      await poller.refresh();
      assert.strictEqual(poller.statuses[0].level, 'Unknown');
      assert.match(poller.statuses[0].error!, /First request failed/);
      assert.strictEqual(pending, 0);
      assert.strictEqual(aborts, 1);
      poller.configure([], 3);
      poller.dispose();
      assert.strictEqual(pending, 0);
      assert.strictEqual(aborts, 1);
    } finally { poller.dispose(); }
  });
  test('isolates rejection and timeout, including adapters ignoring abort', async () => {
    const poller = new StatusPoller(15);
    try {
      poller.configure([provider('ok', async () => good), provider('error', async () => { throw new Error('Network offline'); }), provider('hang', () => new Promise(() => {}))], 3);
      await poller.refresh();
      assert.deepStrictEqual(poller.statuses.map(s => s.level), ['Operational', 'Unknown', 'Unknown']);
      assert.match(poller.statuses[1].error!, /Network offline/);
      assert.match(poller.statuses[2].error!, /timed out/);
    } finally { poller.dispose(); }
  });
  test('rate limits refresh, coalesces checks, and replaces old clear on network loss', async () => {
    let now = 0;
    let requests = 0;
    const poller = new StatusPoller(100, () => now);
    try {
      poller.configure([provider('ok', async () => { if (++requests > 1) { throw new Error('offline'); } return good; })], 0);
      await Promise.all([poller.refresh(), poller.refresh()]);
      await poller.refresh();
      assert.strictEqual(requests, 1);
      now = 60_000;
      await poller.refresh();
      assert.strictEqual(requests, 2);
      assert.strictEqual(poller.statuses[0].level, 'Unknown');
    } finally { poller.dispose(); }
  });
  test('reconfiguration and disposal abort requests and suppress stale updates', async () => {
    const poller = new StatusPoller(1000);
    let signal: AbortSignal | undefined;
    let calls = 0;
    const listener = poller.onUpdate(() => { calls++; });
    poller.configure([provider('old', async value => { signal = value; return new Promise(() => {}); })], 3);
    poller.configure([], 3);
    assert.strictEqual(signal?.aborted, true);
    listener.dispose();
    const previous = calls;
    poller.dispose();
    await poller.refresh();
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.strictEqual(calls, previous);
    assert.deepStrictEqual(poller.statuses, []);
  });
});
