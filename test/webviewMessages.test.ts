import * as assert from 'assert';
import { postToView } from '../src/ui/webviewMessages';

suite('Disposed webview delivery', () => {
  test('closing during a reply handles both synchronous and asynchronous disposal errors', async () => {
    await assert.doesNotReject(postToView({ postMessage: () => { throw new Error('disposed'); } }, { type: 'saved' }));
    await assert.doesNotReject(postToView({ postMessage: async () => { throw new Error('disposed'); } }, { type: 'saveError' }));
    await assert.doesNotReject(postToView({ postMessage: async () => false }, { type: 'refreshError' }));
  });
});
