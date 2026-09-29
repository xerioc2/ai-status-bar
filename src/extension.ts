import * as vscode from 'vscode';
import { readSettings } from './config/settings';
import { createProviders, providerDefinitions } from './providers/registry';
import { StatusPoller } from './services/StatusPoller';
import { StatusBarView } from './ui/StatusBarView';
import { StatusDetailsView } from './ui/StatusDetailsView';
import { orderProviders, selectProviders } from './ui/providerPreferences';
import { StatusPage } from './ui/StatusPage';

export function activate(context: vscode.ExtensionContext): void {
  const poller = new StatusPoller();
  const view = new StatusBarView();
  const details = new StatusDetailsView(providerDefinitions);
  const page = new StatusPage(context.extensionUri, providerDefinitions);
  const configure = () => {
    const settings = readSettings();
    poller.configure(createProviders(settings.enabledProviders), settings.pollIntervalMinutes);
  };
  context.subscriptions.push(
    poller, view, details, page, poller.onUpdate(statuses => { view.render(statuses); details.render(statuses); page.render(statuses); }),
    vscode.commands.registerCommand('aiStatus.openPage', () => page.show()),
    vscode.commands.registerCommand('aiStatus.refresh', () => poller.refresh()),
    vscode.commands.registerCommand('aiStatus.showDetails', () => details.show()),
    vscode.commands.registerCommand('aiStatus.selectProviders', selectProviders),
    vscode.commands.registerCommand('aiStatus.orderProviders', orderProviders),
    vscode.commands.registerCommand('aiStatus.openStatusPage', (id: string) => {
      const provider = providerDefinitions.find(provider => provider.id === id);
      if (provider) { return vscode.env.openExternal(vscode.Uri.parse(provider.statusPageUrl)); }
    }),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('aiStatus')) { configure(); } })
  );
  configure();
}

export function deactivate(): void { /* VS Code disposes context.subscriptions. */ }
