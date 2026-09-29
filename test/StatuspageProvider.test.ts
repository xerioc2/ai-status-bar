import * as assert from 'assert';
import { StatuspageProvider } from '../src/providers/statuspage/StatuspageProvider';

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
    for (const response of [new Response('', { status: 503 }), new Response('<html>'), new Response('{}')]) {
      const request: typeof fetch = async () => response;
      await assert.rejects(new StatuspageProvider(identity, false, request).fetchStatus(new AbortController().signal));
    }
  });
});
