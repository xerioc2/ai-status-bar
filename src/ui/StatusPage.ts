import * as vscode from 'vscode';
import { ServiceStatus } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { normalizeProviders, providerOrder } from '../config/providerSelection';
import { readSettings, saveProviders } from '../config/settings';
import { detailsHtml, preferencesHtml, statusRowsHtml } from './detailsHtml';
import { postToView } from './webviewMessages';
import { webviewPage } from './webviewPage';

// The "AI Status: Open Dashboard" editor tab: provider preferences plus history.
export class StatusPage implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private subscriptions: vscode.Disposable[] = [];
  private statuses: readonly ServiceStatus[] = [];
  private readonly providerIds: string[];

  constructor(private readonly extensionUri: vscode.Uri, private readonly providers: readonly ProviderIdentity[]) {
    this.providerIds = providers.map(provider => provider.id);
  }

  show(): void {
    if (this.panel) { this.panel.reveal(); return; }
    const panel = vscode.window.createWebviewPanel('aiStatus.page', 'AI Status', vscode.ViewColumn.One, { retainContextWhenHidden: true });
    this.panel = panel;
    // Capture the webview before awaiting work; panel.webview can throw after disposal.
    const webview = panel.webview;
    const { enabled, order } = this.preferences();
    const choices = order.flatMap(id => this.providers.filter(provider => provider.id === id));
    webview.html = detailsHtml(this.statuses, this.providers, webviewPage(webview, this.extensionUri, 'status-page.js', preferencesHtml(choices, enabled)));
    this.subscriptions = [
      panel.onDidDispose(() => {
        this.panel = undefined;
        this.subscriptions.splice(0).forEach(item => item.dispose());
      }),
      webview.onDidReceiveMessage(message => this.onMessage(webview, message))
    ];
  }

  render(statuses: readonly ServiceStatus[]): void {
    this.statuses = statuses;
    if (this.panel) {
      void postToView(this.panel.webview, { type: 'update', html: statusRowsHtml(statuses, this.providers), ...this.preferences() });
    }
  }

  private preferences(): { enabled: string[]; order: string[] } {
    const enabled = readSettings().enabledProviders;
    return { enabled, order: providerOrder(enabled, this.providerIds) };
  }

  private async onMessage(webview: vscode.Webview, message: unknown): Promise<void> {
    if (!message || typeof message !== 'object' || !('type' in message)) { return; }
    if (message.type === 'ready') {
      this.render(this.statuses);
    } else if (message.type === 'refresh') {
      try { await vscode.commands.executeCommand('aiStatus.refresh'); }
      catch { await postToView(webview, { type: 'refreshError', text: 'Could not refresh status. Try again.' }); }
    } else if (message.type === 'save' && 'ids' in message && Array.isArray(message.ids)) {
      try {
        await saveProviders(normalizeProviders(message.ids, this.providerIds));
        await postToView(webview, { type: 'saved', ...this.preferences() });
      } catch {
        await postToView(webview, { type: 'saveError', text: 'Could not save provider settings. Check that your settings file is writable and contains valid JSON.' });
      }
    }
  }

  dispose(): void { this.panel?.dispose(); this.subscriptions.splice(0).forEach(item => item.dispose()); }
}
