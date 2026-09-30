import * as assert from 'assert';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createProviders, providerDefinitions, providerIds } from '../src/providers/registry';
import { projectUrls } from '../src/projectMetadata';

const root = resolve(__dirname, '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

suite('Release manifest and provider registry', () => {
  test('default IDs match the registry in order and are unique', () => {
    const defaults = manifest.contributes.configuration.properties['aiStatus.enabledProviders'].default;
    assert.strictEqual(new Set(providerIds).size, providerIds.length);
    assert.deepStrictEqual(defaults, providerIds);
    assert.deepStrictEqual(createProviders(providerIds).map(provider => provider.id), providerIds);
  });
  test('registered icons are local assets and every provider has real fixtures', () => {
    for (const provider of providerDefinitions) {
      assert.match(provider.id, /^[a-z0-9-]+$/);
      if (provider.icon) {
        assert.match(provider.icon, /^[a-z0-9-]+\.svg$/);
        assert.ok(existsSync(resolve(root, 'resources/icons', provider.icon)));
      }
      assert.ok(existsSync(resolve(root, 'test/fixtures', `${provider.id}.json`)));
      assert.ok(existsSync(resolve(root, 'test/fixtures', `${provider.id}-all.json`)));
    }
  });
  test('API types are pinned to the advertised floor and project URLs come from the manifest', () => {
    assert.strictEqual(manifest.engines.vscode, `^${manifest.devDependencies['@types/vscode']}`);
    assert.strictEqual(projectUrls.repository, manifest.repository.url.replace(/\.git$/, ''));
    assert.strictEqual(projectUrls.issues, manifest.bugs.url);
    assert.strictEqual(projectUrls.contributing, `${projectUrls.repository}/blob/main/CONTRIBUTING.md`);
  });
});
