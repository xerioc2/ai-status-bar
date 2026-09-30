import * as vscode from 'vscode';
import { ServiceStatus } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { detailsHtml, statusRowsHtml } from './detailsHtml';
import { postToView } from './webviewMessages';
import { providerIconUris, webviewPage } from './webviewPage';

// The collapsible "AI Status" section in the Explorer sidebar.
export class StatusDetailsView implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly registration: vscode.Disposable;
  private view: vscode.WebviewView | undefined;
  private viewSubscriptions: vscode.Disposable[] = [];
  private statuses: readonly ServiceStatus[] = [];

  constructor(private readonly extensionUri: vscode.Uri, private readonly providers: readonly ProviderIdentity[]) {
    this.registration = vscode.window.registerWebviewViewProvider('aiStatus.explorer', this, { webviewOptions: { retainContextWhenHidden: true } });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.disposeView();
    this.view = view;
    view.webview.html = detailsHtml(this.statuses, this.providers, { ...webviewPage(view.webview, this.extensionUri, 'sidebar.js'), iconUris: providerIconUris(view.webview, this.extensionUri, this.providers) });
    this.viewSubscriptions = [
      view.onDidDispose(() => { this.view = undefined; }),
      view.webview.onDidReceiveMessage(message => { if (message?.type === 'ready') { this.render(this.statuses); } })
    ];
  }

  render(statuses: readonly ServiceStatus[]): void {
    this.statuses = statuses;
    if (this.view) { void postToView(this.view.webview, { type: 'update', html: statusRowsHtml(statuses, this.providers, providerIconUris(this.view.webview, this.extensionUri, this.providers)) }); }
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('aiStatus.explorer.focus');
  }

  private disposeView(): void { this.viewSubscriptions.splice(0).forEach(item => item.dispose()); }

  dispose(): void { this.registration.dispose(); this.disposeView(); this.view = undefined; }
}
