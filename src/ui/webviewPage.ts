import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { PageOptions } from './detailsHtml';
import { ProviderIdentity } from '../providers/StatusProvider';

export function providerIconUris(webview: vscode.Webview, extensionUri: vscode.Uri, providers: readonly ProviderIdentity[]): Record<string, string> {
  return Object.fromEntries(providers.filter(provider => provider.icon && /^[a-z0-9-]+\.svg$/.test(provider.icon))
    .map(provider => [provider.id, webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'icons', provider.icon!)).toString()]));
}

// Shared webview setup for the sidebar and dashboard: restricts loading to
// resources/ and returns the stylesheet, scripts, and CSP values for detailsHtml.
export function webviewPage(webview: vscode.Webview, extensionUri: vscode.Uri, script: string, header?: string): PageOptions {
  const resources = vscode.Uri.joinPath(extensionUri, 'resources');
  const uri = (name: string) => webview.asWebviewUri(vscode.Uri.joinPath(resources, name)).toString();
  webview.options = { enableScripts: true, localResourceRoots: [resources] };
  return {
    nonce: randomBytes(16).toString('hex'),
    cspSource: webview.cspSource,
    styleUri: uri('styles.css'),
    scriptUris: [uri('history-view.js'), uri(script)],
    header
  };
}
