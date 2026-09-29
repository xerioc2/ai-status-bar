import * as vscode from 'vscode';
import { providerDefinitions } from '../providers/registry';
import { normalizeProviders } from './providerSelection';

// The view is workspace-wide. Use the first workspace folder consistently, rather
// than changing scope when the user switches editors or opens the dashboard.
export function settingsResource(): vscode.Uri | undefined { return vscode.workspace.workspaceFolders?.[0]?.uri; }

export function readSettings(resource = settingsResource()): { enabledProviders: string[]; pollIntervalMinutes: number } {
  const config = vscode.workspace.getConfiguration('aiStatus', resource);
  const ids = providerDefinitions.map(provider => provider.id);
  const inspected = config.inspect<unknown>('enabledProviders');
  // Registry additions are enabled automatically unless the user chose an explicit list.
  const requested = inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;
  const interval = config.get<unknown>('pollIntervalMinutes');
  return {
    enabledProviders: normalizeProviders(requested, ids),
    pollIntervalMinutes: typeof interval === 'number' && Number.isFinite(interval) ? Math.max(1, interval) : 3
  };
}

export async function saveProviders(ids: readonly string[], resource = settingsResource()): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiStatus', resource);
  const inspected = config.inspect('enabledProviders');
  // Update the effective override so a workspace setting cannot silently mask the user's choice.
  const target = inspected?.workspaceFolderValue !== undefined ? vscode.ConfigurationTarget.WorkspaceFolder
    : inspected?.workspaceValue !== undefined ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
  await config.update('enabledProviders', [...ids], target);
}
