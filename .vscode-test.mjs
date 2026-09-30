import { defineConfig } from '@vscode/test-cli';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig({ version: process.env.VSCODE_TEST_VERSION || manifest.engines.vscode.replace(/^\^/, ''), files: ['out/test/**/*.test.js', 'out/test/**/*.integration.js'], workspaceFolder: 'test/fixtures/settings.code-workspace', mocha: { ui: 'tdd' } });
