import * as assert from 'assert';
import { historyCacheMs, StatuspageProvider } from '../src/providers/statuspage/StatuspageProvider';

const identity = { id: 'a', displayName: 'A', statusPageUrl: 'https://example.com' };
suite('HTTP adapter', () => {
  test('compatibility API merges history and forwards cancellation', async () => {
    const controller = new AbortController();
    const paths: string[] = [];
    const request: typeof fetch = async (url, init) => {
      paths.push(String(url));
      assert.strictEqual(init?.signal, controller.signal);
      return new Response(JSON.stringify(String(url).includes('summary') ? { status: { indicator: 'none' }, components: [] } : { incidents: [{ name: 'Errors', impact: 'major', status: 'monitoring' }] }));
    };
    const result = await new StatuspageProvider(identity, true, request).fetchStatus(controller.signal);
    assert.strictEqual(paths.length, 2);
    assert.strictEqual(result.level, 'PartialOutage');
    assert.strictEqual(result.incidents[0].stage, 'Monitoring');
  });
  test('rejects HTTP errors and malformed JSON instead of reporting clear', async () => {
    for (const [body, status, expected] of [['', 503, /HTTP 503/], ['<html>', 200, /JSON|Unexpected token/], ['{}', 200, /Unexpected status API response/]] as const) {
      const request: typeof fetch = async url => String(url).includes('summary')
        ? new Response(body, { status }) : new Response('{"incidents":[]}');
      await assert.rejects(new StatuspageProvider(identity, false, request).fetchStatus(new AbortController().signal), expected);
    }
  });
  test('failed optional history never hides a major outage, required history fails closed', async () => {
    const request: typeof fetch = async url => String(url).includes('summary')
      ? new Response(JSON.stringify({ status: { indicator: 'critical' }, components: [], incidents: [] }))
      : new Response('', { status: 503 });
    const result = await new StatuspageProvider(identity, false, request).fetchStatus(new AbortController().signal);
    assert.strictEqual(result.level, 'MajorOutage');
    assert.strictEqual(result.history, undefined);
    await assert.rejects(new StatuspageProvider(identity, true, request).fetchStatus(new AbortController().signal), /HTTP 503/);
  });
  test('caches optional history for 30 minutes but fetches summaries each time', async () => {
    let now = Date.parse('2026-09-28T12:00:00Z');
    let histories = 0;
    let summaries = 0;
    const request: typeof fetch = async url => {
      if (String(url).includes('summary')) {
        summaries++;
        return new Response('{"status":{"indicator":"none"},"components":[],"incidents":[]}');
      }
      histories++;
      return new Response('{"incidents":[]}');
    };
    const provider = new StatuspageProvider(identity, false, request, () => now);
    const signal = new AbortController().signal;
    const first = await provider.fetchStatus(signal);
    now += 60_000;
    const second = await provider.fetchStatus(signal);
    assert.strictEqual(first.historyCheckedAt, second.historyCheckedAt);
    assert.strictEqual(histories, 1);
    assert.strictEqual(summaries, 2);
    now += historyCacheMs;
    await provider.fetchStatus(signal);
    assert.strictEqual(histories, 2);
    const required = new StatuspageProvider(identity, true, request, () => now);
    await required.fetchStatus(signal);
    await required.fetchStatus(signal);
    assert.strictEqual(histories, 4);
  });
  test('a stalled optional history request times out before it can hide current status', async function () {
    this.timeout(5_000);
    const request: typeof fetch = async (url, init) => {
      if (String(url).includes('summary')) { return new Response('{"status":{"indicator":"critical"},"components":[],"incidents":[]}'); }
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('history timeout')), { once: true }));
    };
    const result = await new StatuspageProvider(identity, false, request).fetchStatus(new AbortController().signal);
    assert.strictEqual(result.level, 'MajorOutage');
    assert.strictEqual(result.history, undefined);
  });
});
