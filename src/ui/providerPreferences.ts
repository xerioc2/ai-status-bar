import * as vscode from 'vscode';
import { readSettings, saveProviders } from '../config/settings';
import { moveProvider, providerOrder } from '../config/providerSelection';
import { providerIds, providerName } from '../providers/registry';

// Quick-pick commands for choosing and ordering providers without opening the dashboard.

export async function selectProviders(): Promise<void> {
  const enabled = readSettings().enabledProviders;
  const ids = providerOrder(enabled, providerIds);
  const selected = await vscode.window.showQuickPick(ids.map(id => ({ id, label: providerName(id), picked: enabled.includes(id) })), {
    title: 'AI Status: Choose Providers', canPickMany: true,
    placeHolder: 'Check the providers to show. Uncheck all to disable monitoring.'
  });
  if (selected === undefined) { return; }
  await save(ids.filter(id => selected.some(item => item.id === id)));
}

interface ProviderItem extends vscode.QuickPickItem { id: string }

export async function orderProviders(): Promise<void> {
  let ids = readSettings().enabledProviders;
  const picker = vscode.window.createQuickPick<ProviderItem>();
  const up = { iconPath: new vscode.ThemeIcon('arrow-up'), tooltip: 'Move up' };
  const down = { iconPath: new vscode.ThemeIcon('arrow-down'), tooltip: 'Move down' };
  picker.title = 'AI Status: Order Providers';
  picker.placeholder = ids.length ? 'Use row arrows to reorder. Enter saves; Escape cancels.' : 'No providers selected. Run AI Status: Choose Providers first.';
  picker.ignoreFocusOut = true;
  const render = (active?: string) => {
    picker.items = ids.map((id, index) => ({ id, label: providerName(id),
      description: `${index + 1}`, buttons: [...(index > 0 ? [up] : []), ...(index < ids.length - 1 ? [down] : [])] }));
    if (active) { picker.activeItems = picker.items.filter(item => item.id === active); }
  };
  render();
  const result = await new Promise<string[] | undefined>(resolve => {
    const subscriptions = [
      picker.onDidTriggerItemButton(event => {
        ids = moveProvider(ids, event.item.id, event.button === up ? -1 : 1);
        render(event.item.id);
      }),
      picker.onDidAccept(() => { resolve(ids); picker.hide(); }),
      picker.onDidHide(() => { resolve(undefined); subscriptions.forEach(subscription => subscription.dispose()); picker.dispose(); })
    ];
    picker.show();
  });
  if (result !== undefined) { await save(result); }
}

async function save(ids: readonly string[]): Promise<void> {
  try { await saveProviders(ids); }
  catch { void vscode.window.showErrorMessage('AI Status: Could not save provider settings. Check that your settings file is writable and contains valid JSON.'); }
}
