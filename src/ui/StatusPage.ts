import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { ServiceStatus } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { normalizeProviders, providerOrder } from '../config/providerSelection';
import { readSettings, saveProviders } from '../config/settings';
import { detailsHtml, escapeHtml, statusRowsHtml } from './detailsHtml';
import { postToView } from './webviewMessages';

export class StatusPage implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private subscriptions: vscode.Disposable[] = [];
  private statuses: readonly ServiceStatus[] = [];

  constructor(private readonly extensionUri: vscode.Uri, private readonly providers: readonly ProviderIdentity[]) {}

  show(): void {
    if (this.panel) { this.panel.reveal(); return; }
    const resources = vscode.Uri.joinPath(this.extensionUri, 'resources');
    const panel = vscode.window.createWebviewPanel('aiStatus.page', 'AI Status', vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [resources], retainContextWhenHidden: true });
    this.panel = panel;
    // Capture the webview before awaiting work; panel.webview can throw after disposal.
    const webview = panel.webview;
    const enabled = readSettings().enabledProviders;
    const ordered = providerOrder(enabled, this.providers.map(p => p.id));
    const choices = ordered.map(id => {
      const provider = this.providers.find(p => p.id === id)!;
      return `<div class="choice" data-id="${escapeHtml(id)}"><label><input type="checkbox" ${enabled.includes(id) ? 'checked' : ''}> ${escapeHtml(provider.displayName)}</label><button type="button" data-move="-1" aria-label="Move ${escapeHtml(provider.displayName)} up">↑</button><button type="button" data-move="1" aria-label="Move ${escapeHtml(provider.displayName)} down">↓</button></div>`;
    }).join('');
    panel.webview.html = detailsHtml(this.statuses, this.providers, {
      header: `<h1>AI Status</h1><p class="muted">Choose the services you follow and arrange them your way.</p><section class="preferences" aria-labelledby="preferences-title"><h2 id="preferences-title">Your providers</h2><p>Check providers to show. Use the arrows to set their order in the sidebar, tooltip, and this page.</p><div id="choices">${choices}</div><div class="actions"><button id="save" disabled>Save changes</button><button id="reset">Reset changes</button><button id="refresh">Refresh status</button></div><p id="notice" role="status" aria-live="polite">Changes apply after saving. Uncheck all to disable monitoring.</p></section>`,
      nonce: randomBytes(16).toString('hex'),
      scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(resources, 'status-page.js')).toString(),
      historyScriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(resources, 'history-view.js')).toString()
    });
    this.subscriptions = [panel.onDidDispose(() => {
      this.panel = undefined;
      this.subscriptions.splice(0).forEach(item => item.dispose());
    }), panel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== 'object' || !('type' in message)) { return; }
      if (message.type === 'ready') { this.render(this.statuses); }
      if (message.type === 'refresh') {
        try { await vscode.commands.executeCommand('aiStatus.refresh'); }
        catch { await postToView(webview, { type: 'refreshError', text: 'Could not refresh status. Try again.' }); }
      }
      if (message.type === 'save' && 'ids' in message && Array.isArray(message.ids)) {
        try {
          await saveProviders(normalizeProviders(message.ids, this.providers.map(p => p.id)));
          const enabled = readSettings().enabledProviders;
          await postToView(webview, { type: 'saved', enabled, order: providerOrder(enabled, this.providers.map(p => p.id)) });
        } catch {
          await postToView(webview, { type: 'saveError', text: 'Could not save provider settings. Check that your settings file is writable and contains valid JSON.' });
        }
      }
    })];
  }

  render(statuses: readonly ServiceStatus[]): void {
    this.statuses = statuses;
    const enabled = readSettings().enabledProviders;
    if (this.panel) {
      void postToView(this.panel.webview, { type: 'update', html: statusRowsHtml(statuses, this.providers), enabled, order: providerOrder(enabled, this.providers.map(p => p.id)) });
    }
  }

  dispose(): void { this.panel?.dispose(); this.subscriptions.splice(0).forEach(item => item.dispose()); }
}
