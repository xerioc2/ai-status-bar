// Keep existing code layout; enforce basic EditorConfig whitespace without a dependency.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const excluded = new Set(['.git', 'node_modules', 'out', '.vscode-test', '.npm-cache']);
const write = process.argv.includes('--write');
let failures = 0;
function visit(directory = '.') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name) && !['test/fixtures', 'resources/icons'].includes(path.replaceAll('\\', '/'))) { visit(path); }
    } else if (/\.(?:ts|js|mjs|json|css|md|ya?ml|ps1)$/.test(entry.name) || ['.editorconfig', '.gitattributes', '.gitignore', '.vscodeignore', 'LICENSE'].includes(entry.name)) {
      const source = readFileSync(path, 'utf8');
      let formatted = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      if (!path.endsWith('.md')) { formatted = formatted.replace(/[\t ]+$/gm, ''); }
      formatted = formatted.replace(/\n*$/, '\n');
      if (source !== formatted) {
        if (write) { writeFileSync(path, formatted); }
        else { console.error(`Whitespace: ${path}`); failures++; }
      }
    }
  }
}
visit();
if (failures) { console.error('Run npm run format.'); process.exitCode = 1; }
else { console.log(write ? 'Whitespace normalized.' : 'Formatting check passed.'); }
