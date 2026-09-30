import * as vscode from 'vscode';
import { readSettings } from './config/settings';
import { createProviders, providerDefinitions, providerIds } from './providers/registry';
import { StatusPoller } from './services/StatusPoller';
import { StatusBarView } from './ui/StatusBarView';
import { StatusDetailsView } from './ui/StatusDetailsView';
import { orderProviders, selectProviders } from './ui/providerPreferences';
import { StatusPage } from './ui/StatusPage';

// Wiring only: settings choose which providers the poller checks, and every
// poller update is pushed to the three views.
export function activate(context: vscode.ExtensionContext): void {
  const poller = new StatusPoller();
  const bar = new StatusBarView(providerDefinitions);
  const details = new StatusDetailsView(context.extensionUri, providerDefinitions);
  const page = new StatusPage(context.extensionUri, providerDefinitions);
  const views = [bar, details, page];
  // Created once so each provider keeps its history cache across reconfiguration.
  const providers = createProviders(providerIds);
  const configure = () => {
    const settings = readSettings();
    poller.configure(settings.enabledProviders.flatMap(id => providers.filter(provider => provider.id === id)), settings.pollIntervalMinutes);
  };
  context.subscriptions.push(
    poller, ...views,
    poller.onUpdate(statuses => views.forEach(view => view.render(statuses))),
    vscode.commands.registerCommand('aiStatus.openPage', () => page.show()),
    vscode.commands.registerCommand('aiStatus.refresh', () => poller.refresh()),
    vscode.commands.registerCommand('aiStatus.showDetails', () => details.show()),
    vscode.commands.registerCommand('aiStatus.selectProviders', selectProviders),
    vscode.commands.registerCommand('aiStatus.orderProviders', orderProviders),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('aiStatus')) { configure(); } }),
    vscode.workspace.onDidChangeWorkspaceFolders(configure)
  );
  configure();
}

export function deactivate(): void { /* VS Code disposes context.subscriptions. */ }
