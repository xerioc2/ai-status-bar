import * as assert from 'assert';
import { detailsHtml } from '../src/ui/detailsHtml';

suite('History panel HTML', () => {
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
  test('interactive views add nonce-restricted scripts; static rendering has no scripts', () => {
    const html = detailsHtml([], [], { header: '<h1>AI Status</h1>', nonce: 'test-nonce', scriptUri: 'https://example.com/status-page.js' });
    assert.ok(html.includes("script-src 'nonce-test-nonce'"));
    assert.ok(html.includes('<script nonce="test-nonce"'));
    assert.ok(html.includes('id="history"'));
    assert.ok(!detailsHtml([], []).includes('<script'));
  });
});
