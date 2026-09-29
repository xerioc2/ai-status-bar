import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['out/**', '.vscode-test/**'] }, ...tseslint.configs.recommended);
