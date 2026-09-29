import { defineConfig } from '@vscode/test-cli';
export default defineConfig({ files: ['out/test/**/*.test.js', 'out/test/**/*.integration.js'], workspaceFolder: 'test/fixtures/settings.code-workspace', mocha: { ui: 'tdd' } });
