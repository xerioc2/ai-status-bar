import { ServiceStatus, StatusLevel } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { levelPresentation, providerText } from './formatters';

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

function historyLabel(level: StatusLevel): string {
  return level === 'Operational' ? 'No incidents in available feed' : level === 'Unknown' ? 'History unavailable or unknown impact' : levelPresentation[level].label;
}

export function statusRowsHtml(statuses: readonly ServiceStatus[], providers: readonly ProviderIdentity[]): string {
  return statuses.map(status => {
    const url = providers.find(provider => provider.id === status.providerId)?.statusPageUrl;
    const name = escapeHtml(status.displayName);
    const heading = url?.startsWith('https://') ? `<a href="${escapeHtml(url)}">${name} ↗</a>` : name;
    const bars = status.history?.map(day => {
      const label = `${day.date} (UTC): ${historyLabel(day.level)}${day.incidents.length ? '\n' + day.incidents.join('\n') : ''}`;
      return `<span class="bar ${day.level}" tabindex="0" role="img" aria-label="${escapeHtml(label)}"><span class="tip">${escapeHtml(label)}</span></span>`;
    }).join('');
    return `<article><div class="provider"><h2>${heading}</h2><span class="status"><i class="dot ${status.level}"></i>${escapeHtml(levelPresentation[status.level].label)}</span></div>
      <div class="history">${bars ? `<div class="bars" aria-label="30-day reported incident history">${bars}</div><div class="dates"><span>${status.history![0].date}</span><span>Today (UTC)</span></div>` : '<p class="muted">History unavailable</p>'}</div>
      <details><summary>Report details · ${status.checkedAt ? escapeHtml(new Date(status.checkedAt).toLocaleTimeString()) : 'Awaiting first check'}</summary><pre>${escapeHtml(providerText(status, Date.now()))}</pre></details></article>`;
  }).join('');
}

interface PageOptions {
  header: string;
  scriptUri: string;
  nonce: string;
}

export function detailsHtml(statuses: readonly ServiceStatus[], providers: readonly ProviderIdentity[], page?: PageOptions): string {
  const rows = statusRowsHtml(statuses, providers);
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; ${page ? `script-src 'nonce-${escapeHtml(page.nonce)}';` : ''} base-uri 'none'; form-action 'none'">
    <style>
      body{color:var(--vscode-foreground);background:var(--vscode-sideBar-background);font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);padding:8px 10px;margin:0}
      header{margin-bottom:16px}h1{font-size:14px;margin:0 0 6px}p{line-height:1.5;margin:4px 0}.muted,.dates,summary{color:var(--vscode-descriptionForeground)}
      article{display:grid;grid-template-columns:minmax(200px,1fr) minmax(220px,2fr);gap:10px 24px;padding:16px 0;border-top:1px solid var(--vscode-panel-border)}
      h2{font-size:13px;margin:0 0 7px;font-weight:600}a{color:var(--vscode-textLink-foreground);text-decoration:none}a:hover{text-decoration:underline}
      .status{display:flex;align-items:center;gap:7px}.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
      .bars{display:flex;gap:3px;padding:3px 0}.bar{position:relative;height:25px;flex:1;min-width:3px;border-radius:2px;outline-offset:2px}
      ${Object.entries(levelPresentation).map(([level, presentation]) => `.${level}{background:${presentation.chartColor}}`).join('\n')}
      .Unknown{background:repeating-linear-gradient(135deg,var(--vscode-disabledForeground) 0 2px,transparent 2px 4px);outline:1px solid var(--vscode-disabledForeground)}
      .tip{display:none;position:absolute;top:32px;right:0;width:240px;white-space:pre-wrap;background:var(--vscode-editorHoverWidget-background);color:var(--vscode-editorHoverWidget-foreground);border:1px solid var(--vscode-editorHoverWidget-border);padding:8px;z-index:10;box-shadow:0 2px 8px var(--vscode-widget-shadow)}
      .bar:nth-child(-n+15) .tip{left:0;right:auto}.bar:hover .tip,.bar:focus .tip{display:block}.dates{display:flex;justify-content:space-between;font-size:11px;margin-top:5px}
      details{grid-column:1/-1}summary{cursor:pointer;font-size:11px}pre{font:inherit;white-space:pre-wrap;line-height:1.6;overflow-wrap:anywhere}
      .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;margin-top:10px}.legend span{display:flex;align-items:center;gap:5px}
      @media(max-width:540px){article{grid-template-columns:1fr}.tip{width:160px}}
      :focus-visible{outline:1px solid var(--vscode-focusBorder)}
      ${page ? `body{background:var(--vscode-editor-background);max-width:1050px;padding:24px;margin:auto}h1{font-size:24px}h2{font-size:16px}.preferences{margin:24px 0;padding:16px;border:1px solid var(--vscode-panel-border);border-radius:6px}.choice{display:flex;align-items:center;gap:10px;padding:8px 0}.choice label{flex:1}button{cursor:pointer;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:1px solid transparent;border-radius:3px;padding:6px 10px;font:inherit}button:hover{background:var(--vscode-button-hoverBackground)}button:disabled{opacity:.45;cursor:default}.actions{display:flex;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap}input{accent-color:var(--vscode-focusBorder)}#notice{min-height:1.5em}.history-heading{font-size:16px}` : ''}
    </style></head><body>${page?.header ?? ''}<header><h1 class="history-heading">Last 30 days</h1><details><summary>About this incident history</summary>
    <p class="muted">Daily worst impact in the available provider feed, not measured uptime. Feeds may be incomplete; striped days have no usable history or unknown impact. Today is partial.</p>
    <div class="legend">${(['Operational', 'Degraded', 'PartialOutage', 'MajorOutage', 'Maintenance', 'Unknown'] as StatusLevel[]).map(level => `<span><i class="dot ${level}"></i>${historyLabel(level)}</span>`).join('')}</div></details></header>
    <main id="history">${rows || '<p>No providers enabled. Choose providers in AI Status settings.</p>'}</main>${page ? `<script nonce="${escapeHtml(page.nonce)}" src="${escapeHtml(page.scriptUri)}"></script>` : ''}</body></html>`;
}
