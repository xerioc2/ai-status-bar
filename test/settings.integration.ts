import * as assert from 'assert';
import * as vscode from 'vscode';
import { readSettings, saveProviders, settingsResource } from '../src/config/settings';

suite('Multi-root settings', () => {
  test('reads and saves the same folder override without changing the other folder', async () => {
    const folders = vscode.workspace.workspaceFolders!;
    assert.strictEqual(folders.length, 2);
    assert.strictEqual(settingsResource()?.toString(), folders[0].uri.toString());
    const before = readSettings().enabledProviders;
    const second = readSettings(folders[1].uri).enabledProviders;
    try {
      await saveProviders(['openai', 'cursor']);
      assert.deepStrictEqual(readSettings().enabledProviders, ['openai', 'cursor']);
      assert.deepStrictEqual(readSettings(folders[1].uri).enabledProviders, second);
      assert.deepStrictEqual(vscode.workspace.getConfiguration('aiStatus', folders[0].uri).inspect('enabledProviders')?.workspaceFolderValue, ['openai', 'cursor']);
    } finally { await saveProviders(before); }
  });
});
