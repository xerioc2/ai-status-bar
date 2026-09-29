import * as assert from 'assert';
import { PollScheduler, StatusPoller } from '../src/services/StatusPoller';
import { StatusProvider } from '../src/providers/StatusProvider';

class Clock implements PollScheduler {
  now = 0;
  due = Infinity;
  callback: (() => void) | undefined;
  set(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    this.callback = callback; this.due = this.now + delay;
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }
  clear(): void { this.callback = undefined; this.due = Infinity; }
  fire(at: number): void { this.now = at; const callback = this.callback; this.clear(); callback?.(); }
}
const provider = (id: string, calls: string[]): StatusProvider => ({ id, displayName: id, statusPageUrl: 'https://example.com', fetchStatus: async () => {
  calls.push(id);
  return { providerId: id, displayName: id, level: 'Operational', affectedComponents: [], incidents: [], checkedAt: new Date().toISOString() };
} });

suite('Polling deadlines', () => {
  test('settings during cooldown check new providers at the first allowed minute', async () => {
    const clock = new Clock(); const calls: string[] = [];
    const poller = new StatusPoller(100, () => clock.now, clock);
    try {
      poller.configure([provider('a', calls)], 3); await poller.refresh();
      clock.now = 20_000;
      poller.configure([provider('a', calls), provider('b', calls)], 3);
      assert.strictEqual(clock.due, 60_000);
      clock.fire(60_000); await poller.refresh();
      assert.deepStrictEqual(calls, ['a', 'a', 'b']);
      assert.strictEqual(clock.due, 240_000);
    } finally { poller.dispose(); }
    assert.strictEqual(clock.callback, undefined);
  });
  test('manual refresh and early timer drift reschedule instead of skipping a cycle', async () => {
    const clock = new Clock(); const calls: string[] = [];
    const poller = new StatusPoller(100, () => clock.now, clock);
    try {
      poller.configure([provider('a', calls)], 1); await poller.refresh();
      clock.now = 30_000; await poller.refresh();
      assert.strictEqual(clock.due, 60_000);
      clock.fire(59_999);
      assert.strictEqual(clock.due, 60_000);
      clock.fire(60_000); await poller.refresh();
      assert.strictEqual(calls.length, 2);
      assert.strictEqual(clock.due, 120_000);
      clock.now = 130_000; await poller.refresh();
      assert.strictEqual(clock.due, 190_000);
    } finally { poller.dispose(); }
  });
});
