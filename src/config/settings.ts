import * as vscode from 'vscode';
import { providerDefinitions } from '../providers/registry';
import { normalizeProviders } from './providerSelection';

export function readSettings(): { enabledProviders: string[]; pollIntervalMinutes: number } {
  const config = vscode.workspace.getConfiguration('aiStatus');
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

export async function saveProviders(ids: readonly string[]): Promise<void> {
  const config = vscode.workspace.getConfiguration('aiStatus');
  const inspected = config.inspect('enabledProviders');
  // Update the effective override so a workspace setting cannot silently mask the user's choice.
  const target = inspected?.workspaceFolderValue !== undefined ? vscode.ConfigurationTarget.WorkspaceFolder
    : inspected?.workspaceValue !== undefined ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
  await config.update('enabledProviders', [...ids], target);
}
