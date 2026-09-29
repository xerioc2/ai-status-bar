import * as assert from 'assert';
import { normalizeProviders, moveProvider, providerOrder } from '../src/config/providerSelection';
import { createProviders } from '../src/providers/registry';

suite('Provider preferences', () => {
  test('shared ordering puts enabled providers first and adds each remaining provider once', () => {
    assert.deepStrictEqual(providerOrder(['c', 'a', 'c', 'invalid'], ['a', 'b', 'c']), ['c', 'a', 'b']);
  });
  test('preserves chosen order and removes invalid or duplicate IDs', () => {
    assert.deepStrictEqual(normalizeProviders(['cursor', 'missing', 'openai', 'cursor', 3], ['openai', 'cursor']), ['cursor', 'openai']);
    assert.deepStrictEqual(createProviders(['cursor', 'missing', 'openai', 'cursor']).map(p => p.id), ['cursor', 'openai']);
  });
  test('defaults to all providers while respecting an explicit empty selection', () => {
    assert.deepStrictEqual(normalizeProviders(undefined, ['a', 'b']), ['a', 'b']);
    assert.deepStrictEqual(normalizeProviders([], ['a', 'b']), []);
  });
  test('moves providers in both directions without changing the source', () => {
    const ids = ['a', 'b', 'c'];
    assert.deepStrictEqual(moveProvider(ids, 'b', -1), ['b', 'a', 'c']);
    assert.deepStrictEqual(moveProvider(ids, 'b', 1), ['a', 'c', 'b']);
    assert.deepStrictEqual(moveProvider(ids, 'a', -1), ids);
    assert.deepStrictEqual(moveProvider(ids, 'c', 1), ids);
    assert.deepStrictEqual(moveProvider(ids, 'missing', 1), ids);
    assert.deepStrictEqual(ids, ['a', 'b', 'c']);
  });
});
