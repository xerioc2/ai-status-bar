import * as assert from 'assert';
import { detailsHtml, preferencesHtml, statusRowsHtml } from '../src/ui/detailsHtml';

suite('History panel HTML', () => {
  test('new provider icons need only metadata, with text fallback when absent', () => {
    const providers = [{ id: 'new-provider', displayName: 'New Provider', statusPageUrl: 'https://example.com' }];
    const status = { providerId: 'new-provider', displayName: 'New Provider', level: 'Operational' as const, checkedAt: '', affectedComponents: [], incidents: [] };
    const icons = { 'new-provider': 'https://webview.test/icons/new-provider.svg' };
    assert.match(statusRowsHtml([status], providers, icons), /src="https:\/\/webview.test\/icons\/new-provider.svg" alt=""/);
    assert.match(preferencesHtml(providers, [], icons), /class="provider-icon"/);
    assert.ok(!statusRowsHtml([status], providers).includes('<img'));
  });
  test('escapes upstream text, shows dated bars and restricts content', () => {
    const html = detailsHtml([{ providerId: 'a', displayName: '<script>bad</script>', level: 'Operational', checkedAt: '', affectedComponents: [], incidents: [], history: [{ date: '2026-09-28', level: 'Degraded', incidents: ['<img src=x onerror=bad>'] }] }], [{ id: 'a', displayName: 'A', statusPageUrl: 'https://example.com' }]);
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('2026-09-28 (UTC)'));
    assert.ok(html.includes("default-src 'none'"));
    assert.ok(html.includes('href="https://example.com"'));
  });
  test('empty provider selection has a useful message', () => {
    assert.match(detailsHtml([], []), /No providers enabled/);
  });
  test('missing history is neutral and settings start collapsed', () => {
    const html = detailsHtml([{ providerId: 'a', displayName: 'A', level: 'Unknown', checkedAt: '', incidents: [], affectedComponents: [], history: [{ date: '2026-09-29', level: 'Unknown', incidents: [] }] }], []);
    assert.match(html, /Unknown missing-history/);
    assert.match(html, /Days with reported incidents/);
    assert.match(html, /Last 30 days · UTC/);
    const preferences = preferencesHtml([], []);
    assert.match(preferences, /<details class="preferences"><summary>Customize providers/);
    assert.ok(!preferences.includes('<details class="preferences" open'));
  });
  test('interactive views add nonce-restricted scripts; static rendering has no scripts', () => {
    const html = detailsHtml([], [], { header: '<h1>AI Status</h1>', nonce: 'test-nonce', cspSource: 'https://webview.test', styleUri: 'https://webview.test/styles.css', scriptUris: ['https://webview.test/status-page.js'] });
    assert.ok(html.includes("script-src 'nonce-test-nonce'"));
    assert.ok(html.includes('style-src https://webview.test'));
    assert.ok(!html.includes('unsafe-inline'));
    assert.ok(html.includes('<script nonce="test-nonce" src="https://webview.test/status-page.js"'));
    assert.ok(html.includes('<body class="dashboard">'));
    assert.ok(html.includes('id="history"'));
    assert.ok(!detailsHtml([], []).includes('<script'));
  });
  test('preferences escape provider names and keep the given order', () => {
    const html = preferencesHtml([{ id: 'b', displayName: '<B>', statusPageUrl: '' }, { id: 'a', displayName: 'A', statusPageUrl: '' }], ['a']);
    assert.ok(html.indexOf('data-id="b"') < html.indexOf('data-id="a"'));
    assert.ok(html.includes('&lt;B&gt;') && !html.includes('<B>'));
    assert.match(html, /data-id="a"><label><input type="checkbox" checked>/);
    assert.match(html, /data-id="b"><label><input type="checkbox" >/);
  });
});
