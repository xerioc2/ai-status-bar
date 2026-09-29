import * as assert from 'assert';
import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { statusRowsHtml } from '../src/ui/detailsHtml';
import { ServiceStatus } from '../src/core/types';

suite('Webview interaction state', () => {
  test('refresh preserves expanded reports, scroll, focused bar, and preference draft in a real webview', async function () {
    this.timeout(15_000);
    const status: ServiceStatus = { providerId: 'a', displayName: 'A', level: 'Operational', checkedAt: '2026-09-28', incidents: [], affectedComponents: [], history: [{ date: '2026-09-28', level: 'Operational', incidents: [] }] };
    const first = statusRowsHtml([status], []);
    const next = statusRowsHtml([{ ...status, level: 'Degraded' }], []);
    const script = (name: string) => readFileSync(resolve(__dirname, '../../resources', name), 'utf8');
    const panel = vscode.window.createWebviewPanel('aiStatus.stateTest', 'State regression test', vscode.ViewColumn.One, { enableScripts: true });
    let subscription: vscode.Disposable | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = new Promise<string>((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Webview regression test timed out')), 10_000);
        subscription = panel.webview.onDidReceiveMessage(message => resolve(message.result));
      });
      panel.webview.html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-test'; style-src 'unsafe-inline'"></head><body>
        <div id="choices"><div class="choice" data-id="a"><input type="checkbox" checked><button data-move="-1">Up</button><button data-move="1">Down</button></div><div class="choice" data-id="b"><input type="checkbox"><button data-move="-1">Up</button><button data-move="1">Down</button></div></div>
        <button id="save">Save</button><button id="reset">Reset</button><button id="refresh">Refresh</button><p id="notice"></p>
        <div style="height:500px"></div><main id="history">${first}</main><div style="height:2000px"></div>
        <script nonce="test">const api = acquireVsCodeApi(); const sent = [];
        ${script('history-view.js')}
        (function(acquireVsCodeApi) { ${script('status-page.js')} })(() => ({postMessage: message => sent.push(message)}));
        function check(value, message) { if (!value) throw new Error(message); }
        function update() { window.dispatchEvent(new MessageEvent('message', {data: {type:'update', html:${JSON.stringify(next)}, enabled:['a'], order:['a','b']}})); }
        requestAnimationFrame(() => { try {
          const report = document.querySelector('#history details'); report.open = true;
          document.querySelector('[data-focus="2026-09-28"]').focus(); window.scrollTo(0, 200);
          const scroll = window.scrollY; update();
          check(document.querySelector('#history details').open, 'report collapsed');
          check(document.activeElement.dataset.focus === '2026-09-28', 'bar focus lost');
          check(window.scrollY === scroll, 'scroll changed');
          const checkbox = document.querySelector('[data-id="b"] input'); checkbox.checked = true; checkbox.dispatchEvent(new Event('change', {bubbles:true})); checkbox.focus();
          update(); check(checkbox.checked, 'draft lost'); check(document.activeElement === checkbox, 'preference focus lost');
          document.getElementById('save').click();
          check(sent.at(-1).type === 'save' && sent.at(-1).ids.join(',') === 'a,b', 'wrong saved selection');
          window.dispatchEvent(new MessageEvent('message', {data:{type:'saveError', text:'Failed'}}));
          check(!document.getElementById('save').disabled, 'save remains stuck');
          window.dispatchEvent(new MessageEvent('message', {data:{type:'refreshError', text:'Refresh failed'}}));
          check(document.getElementById('notice').textContent === 'Refresh failed', 'refresh error missing');
          api.postMessage({result:'ok'});
        } catch (error) { api.postMessage({result:error.message}); } });</script></body></html>`;
      assert.strictEqual(await result, 'ok');
    } finally { clearTimeout(timeout); subscription?.dispose(); panel.dispose(); }
  });
});
