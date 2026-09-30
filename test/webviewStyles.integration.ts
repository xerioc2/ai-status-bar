import * as assert from 'assert';
import * as vscode from 'vscode';
import { detailsHtml, preferencesHtml } from '../src/ui/detailsHtml';
import { webviewPage } from '../src/ui/webviewPage';
import { ServiceStatus } from '../src/core/types';

suite('External webview stylesheet', () => {
  for (const dashboard of [false, true]) {
    test(`loads production CSS under the production CSP in ${dashboard ? 'dashboard' : 'sidebar'} mode`, async function () {
      this.timeout(15_000);
      const extension = vscode.extensions.all.find(item => item.packageJSON.name === 'ai-status-bar')!;
      const providers = [{ id: 'a', displayName: 'Example', statusPageUrl: 'https://example.com' }];
      const status: ServiceStatus = { providerId: 'a', displayName: 'Example', level: 'Operational', checkedAt: '', incidents: [], affectedComponents: [],
        history: [{ date: '2026-09-29', level: 'Operational', incidents: [] }] };
      const panel = vscode.window.createWebviewPanel('aiStatus.stylesTest', 'Styles regression test', vscode.ViewColumn.One, {});
      const page = webviewPage(panel.webview, extension.extensionUri, dashboard ? 'status-page.js' : 'sidebar.js', dashboard ? preferencesHtml(providers, ['a']) : undefined);
      // Exercise the real resource URL and CSP, with a test probe instead of UI event handlers.
      page.scriptUris = [];
      let listener: vscode.Disposable | undefined;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = new Promise<Record<string, string>>((resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Stylesheet probe timed out')), 10_000);
          listener = panel.webview.onDidReceiveMessage(resolve);
        });
        const probe = `<script nonce="${page.nonce}">
          const api = acquireVsCodeApi();
          window.addEventListener('load', async () => {
            const iconLoads = await Promise.all(['anthropic', 'openai', 'github', 'cursor', 'perplexity'].map(id => new Promise(resolve => {
              const image = new Image();
              image.onload = () => resolve(image.naturalWidth > 0);
              image.onerror = () => resolve(false);
              image.src = new URL('icons/' + id + '.svg', document.querySelector('link[rel="stylesheet"]').href).href;
            })));
            api.postMessage({
              iconsLoaded: String(iconLoads.every(Boolean)),
              barHeight: getComputedStyle(document.querySelector('.bar')).height,
              barColor: getComputedStyle(document.querySelector('.bar')).backgroundColor,
              themeGreen: getComputedStyle(document.documentElement).getPropertyValue('--vscode-charts-green').trim(),
              preferencesCollapsed: String(!document.querySelector('.preferences')?.open),
              barsLayout: getComputedStyle(document.querySelector('.bars')).display,
              tooltip: getComputedStyle(document.querySelector('.tip')).display,
              bodyPadding: getComputedStyle(document.body).paddingLeft,
              titleSize: getComputedStyle(document.querySelector('h1')).fontSize,
              historyTitleSize: getComputedStyle(document.querySelector('.history-heading')).fontSize
            });
          });
        </script>`;
        panel.webview.html = detailsHtml([status], providers, page).replace('</body>', probe + '</body>');
        const { barColor, themeGreen, preferencesCollapsed, iconsLoaded, ...layout } = await result;
        assert.strictEqual(iconsLoaded, 'true', 'All bundled icons must load under the production CSP');
        const green = themeGreen || '#20bfa5';
        const expectedGreen = /^#[\da-f]{6}$/i.test(green)
          ? `rgb(${[1, 3, 5].map(start => parseInt(green.slice(start, start + 2), 16)).join(', ')})` : green;
        assert.strictEqual(barColor, expectedGreen);
        assert.strictEqual(preferencesCollapsed, 'true');
        assert.deepStrictEqual(layout, {
          barHeight: '25px', barsLayout: 'flex', tooltip: 'none',
          bodyPadding: dashboard ? '24px' : '10px', titleSize: dashboard ? '24px' : '14px', historyTitleSize: dashboard ? '16px' : '14px'
        });
      } finally { clearTimeout(timeout); listener?.dispose(); panel.dispose(); }
    });
  }
});
