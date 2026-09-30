import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { PageOptions } from './detailsHtml';

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
