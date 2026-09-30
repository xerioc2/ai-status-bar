import * as vscode from 'vscode';
import { ServiceStatus } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { formatBar, levelPresentation, providerText } from './formatters';

export class StatusBarView implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  constructor(private readonly providers: readonly ProviderIdentity[]) {
    this.item.name = 'AI provider status';
    this.item.command = 'aiStatus.showDetails';
    this.render([]);
    this.item.show();
  }
  render(statuses: readonly ServiceStatus[]): void {
    const bar = formatBar(statuses);
    this.item.text = bar.text;
    this.item.backgroundColor = bar.background ? new vscode.ThemeColor(bar.background) : undefined;
    const tooltip = new vscode.MarkdownString();
    // Provider-authored text is untrusted; appendText escapes Markdown and command links.
    tooltip.appendText('AI status — reports published by providers\n\n');
    if (!statuses.length) { tooltip.appendText('No providers enabled.\n'); }
    for (const status of statuses) {
      tooltip.appendText(`${providerText(status, Date.now())}\n`);
      // Status page URLs come from the registry, not the provider feed.
      const url = this.providers.find(provider => provider.id === status.providerId)?.statusPageUrl;
      if (url?.startsWith('https://')) { tooltip.appendMarkdown(`[Open status page](${url})`); }
      tooltip.appendText('\n\n');
    }
    tooltip.appendText('Refresh is limited to once per minute. Select to open AI Status in the Explorer sidebar.');
    this.item.tooltip = tooltip;
    this.item.accessibilityInformation = { label: statuses.length ? statuses.map(s => `${s.displayName}: ${levelPresentation[s.level].label}`).join('; ') : 'AI status: no providers enabled' };
  }
  dispose(): void { this.item.dispose(); }
}
