import * as vscode from 'vscode';
import { ServiceStatus } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { detailsHtml } from './detailsHtml';

export class StatusDetailsView implements vscode.WebviewViewProvider, vscode.Disposable {
  private readonly registration: vscode.Disposable;
  private view: vscode.WebviewView | undefined;
  private viewDisposal: vscode.Disposable | undefined;
  private statuses: readonly ServiceStatus[] = [];

  constructor(private readonly providers: readonly ProviderIdentity[]) {
    this.registration = vscode.window.registerWebviewViewProvider('aiStatus.explorer', this);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.viewDisposal?.dispose();
    this.view = view;
    this.viewDisposal = view.onDidDispose(() => { this.view = undefined; });
    view.webview.options = { enableScripts: false, localResourceRoots: [] };
    this.render(this.statuses);
  }

  render(statuses: readonly ServiceStatus[]): void {
    this.statuses = statuses;
    if (this.view) { this.view.webview.html = detailsHtml(statuses, this.providers); }
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('aiStatus.explorer.focus');
  }

  dispose(): void { this.registration.dispose(); this.viewDisposal?.dispose(); this.view = undefined; }
}
