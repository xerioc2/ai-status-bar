import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension host', () => {
  test('activates, registers commands, and opens the collapsed Explorer view', async function () {
    this.timeout(20_000);
    const extension = vscode.extensions.all.find(item => item.packageJSON.name === 'ai-provider-status-monitor');
    assert.ok(extension, 'Development extension is installed');
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('aiStatus.refresh'));
    assert.ok(commands.includes('aiStatus.showDetails'));
    assert.ok(commands.includes('aiStatus.selectProviders'));
    assert.ok(commands.includes('aiStatus.orderProviders'));
    assert.ok(extension.packageJSON.contributes.views.explorer.some((view: { id: string; visibility: string }) => view.id === 'aiStatus.explorer' && view.visibility === 'collapsed'));
    await vscode.commands.executeCommand('aiStatus.showDetails');
    await vscode.commands.executeCommand('aiStatus.refresh');
  });
  test('opens and reuses the dashboard editor tab', async function () {
    this.timeout(10_000);
    await vscode.commands.executeCommand('aiStatus.openPage');
    await vscode.commands.executeCommand('aiStatus.openPage');
    const dashboardTabs = () => vscode.window.tabGroups.all.flatMap(group => group.tabs)
      .filter(tab => tab.label === 'AI Status' && tab.input instanceof vscode.TabInputWebview);
    // The renderer reports new tabs asynchronously after createWebviewPanel returns.
    const deadline = Date.now() + 5_000;
    while (!dashboardTabs().length && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const tabs = dashboardTabs();
    assert.strictEqual(tabs.length, 1);
    await vscode.window.tabGroups.close(tabs[0]);
  });
});
