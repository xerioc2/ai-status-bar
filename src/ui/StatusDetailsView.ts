import * as vscode from 'vscode';
import { ServiceStatus } from '../core/types';
import { randomBytes } from 'crypto';
import { ProviderIdentity } from '../providers/StatusProvider';
import { detailsHtml, statusRowsHtml } from './detailsHtml';
import { postToView } from './webviewMessages';

export class StatusDetailsView implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly registration: vscode.Disposable;
  private view: vscode.WebviewView | undefined;
  private viewDisposal: vscode.Disposable | undefined;
  private messages: vscode.Disposable | undefined;
  private statuses: readonly ServiceStatus[] = [];

  constructor(private readonly extensionUri: vscode.Uri, private readonly providers: readonly ProviderIdentity[]) {
    this.registration = vscode.window.registerWebviewViewProvider('aiStatus.explorer', this, { webviewOptions: { retainContextWhenHidden: true } });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.viewDisposal?.dispose();
    this.messages?.dispose();
    this.view = view;
    this.viewDisposal = view.onDidDispose(() => { this.view = undefined; });
    const resources = vscode.Uri.joinPath(this.extensionUri, 'resources');
    view.webview.options = { enableScripts: true, localResourceRoots: [resources] };
    view.webview.html = detailsHtml(this.statuses, this.providers, {
      header: '', nonce: randomBytes(16).toString('hex'),
      scriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(resources, 'sidebar.js')).toString(),
      historyScriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(resources, 'history-view.js')).toString()
    });
    this.messages = view.webview.onDidReceiveMessage(message => { if (message?.type === 'ready') { this.render(this.statuses); } });
  }

  render(statuses: readonly ServiceStatus[]): void {
    this.statuses = statuses;
    if (this.view) { void postToView(this.view.webview, { type: 'update', html: statusRowsHtml(statuses, this.providers) }); }
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('aiStatus.explorer.focus');
  }

  dispose(): void { this.registration.dispose(); this.viewDisposal?.dispose(); this.messages?.dispose(); this.view = undefined; }
}
