// Read the shipped manifest so UI links follow repository metadata.
import { readFileSync } from 'fs';
import { resolve } from 'path';

const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
const repository = (manifest.repository.url as string).replace(/\.git$/, '');
export const projectUrls = {
  repository,
  issues: manifest.bugs.url as string,
  contributing: `${repository}/blob/main/CONTRIBUTING.md`
};
