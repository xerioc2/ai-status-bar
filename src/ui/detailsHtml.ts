import { ServiceStatus, StatusLevel } from '../core/types';
import { ProviderIdentity } from '../providers/StatusProvider';
import { levelPresentation, providerText } from './formatters';

// All provider-authored text passes through escapeHtml before it reaches a webview.
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

const levels: StatusLevel[] = ['Operational', 'Degraded', 'PartialOutage', 'MajorOutage', 'Maintenance', 'Unknown'];

function providerIcon(id: string): string {
  return ['anthropic', 'openai', 'github', 'cursor', 'perplexity'].includes(id)
    ? `<span class="provider-icon icon-${id}" aria-hidden="true"></span>` : '';
}

function historyLabel(level: StatusLevel): string {
  return level === 'Operational' ? 'No incidents in available feed' : level === 'Unknown' ? 'History unavailable or unknown impact' : levelPresentation[level].label;
}

function historyHtml(status: ServiceStatus): string {
  const history = status.history;
  if (!history?.length) { return '<p class="muted">History unavailable</p>'; }
  const bars = history.map(day => {
    const label = `${day.date} (UTC): ${historyLabel(day.level)}${day.incidents.length ? '\n' + day.incidents.join('\n') : ''}`;
    const missing = day.level === 'Unknown' && day.incidents.length === 0 ? ' missing-history' : '';
    return `<span data-focus="${escapeHtml(day.date)}" class="bar ${day.level}${missing}" tabindex="0" role="img" aria-label="${escapeHtml(label)}"><span class="tip">${escapeHtml(label)}</span></span>`;
  }).join('');
  return `<div class="bars" aria-label="30-day reported incident history">${bars}</div>`
    + `<div class="dates"><span>${shortDate(history[0].date)}</span><span>${shortDate(history.at(-1)!.date)}</span></div>`
    + (history.some(day => day.level === 'Unknown' && !day.incidents.length)
      ? '<p class="coverage-note">Faint bars: history unavailable</p>' : '');
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function reportHtml(status: ServiceStatus): string {
  const checked = status.checkedAt ? escapeHtml(new Date(status.checkedAt).toLocaleTimeString()) : 'Awaiting first check';
  const historyFetched = status.historyCheckedAt ? `<p class="muted">History fetched: ${escapeHtml(new Date(status.historyCheckedAt).toLocaleString())}</p>` : '';
  const links = status.incidents.filter(incident => incident.url.startsWith('https://'))
    .map((incident, index) => `<p><a data-focus="incident-${index}" href="${escapeHtml(incident.url)}">${escapeHtml(incident.title)} ↗</a></p>`).join('');
  return `<details class="report"><summary data-focus="report">Report details <span class="checked">· ${checked}</span></summary><pre>${escapeHtml(providerText(status, Date.now()))}</pre>${historyFetched}${links}</details>`;
}

export function statusRowsHtml(statuses: readonly ServiceStatus[], providers: readonly ProviderIdentity[]): string {
  return statuses.map(status => {
    const url = providers.find(provider => provider.id === status.providerId)?.statusPageUrl;
    const name = providerIcon(status.providerId) + escapeHtml(status.displayName);
    const heading = url?.startsWith('https://') ? `<a data-focus="provider" href="${escapeHtml(url)}">${name} ↗</a>` : name;
    return `<article data-provider="${escapeHtml(status.providerId)}">`
      + `<div class="provider"><h2>${heading}</h2><span class="status"><i class="dot ${status.level}"></i><span class="muted">Now:</span> ${escapeHtml(levelPresentation[status.level].label)}</span></div>`
      + `<div class="history">${historyHtml(status)}</div>${reportHtml(status)}</article>`;
  }).join('');
}

// Dashboard provider checkboxes. `providers` is already in display order.
export function preferencesHtml(providers: readonly ProviderIdentity[], enabled: readonly string[]): string {
  const choices = providers.map(({ id, displayName }) => {
    const name = escapeHtml(displayName);
    return `<div class="choice" data-id="${escapeHtml(id)}"><label><input type="checkbox" ${enabled.includes(id) ? 'checked' : ''}> ${providerIcon(id)}${name}</label>`
      + `<button type="button" data-move="-1" aria-label="Move ${name} up">↑</button><button type="button" data-move="1" aria-label="Move ${name} down">↓</button></div>`;
  }).join('');
  return `<div class="page-heading"><div><h1>AI Status</h1><p class="muted">Current provider reports and recent incident history.</p></div><button id="refresh" class="secondary">Refresh status</button></div>
    <details class="preferences"><summary>Customize providers</summary>
    <p>Check providers to show. Use the arrows to set their order in the sidebar, tooltip, and this page.</p>
    <div id="choices">${choices}</div>
    <div class="actions"><button id="save" disabled>Save changes</button><button id="reset" class="secondary">Reset changes</button></div>
    <p class="muted">Changes apply after saving. Uncheck all to disable monitoring.</p></details>
    <p id="notice" role="status" aria-live="polite"></p>`;
}

export interface PageOptions {
  nonce: string;
  cspSource: string;
  styleUri: string;
  scriptUris: readonly string[];
  // Dashboard-only content above the history; its presence selects the dashboard layout.
  header?: string;
}

// Without `page`, renders static markup with no scripts or stylesheet (used by tests).
export function detailsHtml(statuses: readonly ServiceStatus[], providers: readonly ProviderIdentity[], page?: PageOptions): string {
  const rows = statusRowsHtml(statuses, providers);
  const csp = `default-src 'none'; base-uri 'none'; form-action 'none'`
    + (page ? `; style-src ${page.cspSource}; img-src ${page.cspSource}; script-src 'nonce-${escapeHtml(page.nonce)}'` : '');
  const style = page ? `<link rel="stylesheet" href="${escapeHtml(page.styleUri)}">` : '';
  const scripts = page?.scriptUris.map(uri => `<script nonce="${escapeHtml(page.nonce)}" src="${escapeHtml(uri)}"></script>`).join('') ?? '';
  const legend = levels.map(level => `<span><i class="dot ${level}"></i>${historyLabel(level)}</span>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">${style}</head>
    <body${page?.header ? ' class="dashboard"' : ''}>${page?.header ?? ''}
    <header><h1 class="history-heading">Days with reported incidents</h1><p class="muted history-period">Last 30 days · UTC</p><details><summary>How to read this history</summary>
    <p class="muted">A colored day means an incident was reported, not that the service was down all day. Color shows the worst published impact; hover or focus a bar for details. Feeds may be incomplete. Faint bars have no usable history. This is not measured uptime; the latest day may be partial.</p>
    <div class="legend">${legend}</div></details></header>
    <main id="history">${rows || '<p>No providers enabled. Choose providers in AI Status settings.</p>'}</main>
    <footer class="project-links" aria-label="Contribute to AI Status"><a href="https://github.com/xerioc2/ai-status-bar">GitHub</a><a href="https://github.com/xerioc2/ai-status-bar/issues/new">Bugs &amp; suggestions</a><a href="https://github.com/xerioc2/ai-status-bar/blob/main/CONTRIBUTING.md">Contribute a PR</a></footer>${scripts}</body></html>`;
}
