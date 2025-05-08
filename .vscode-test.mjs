import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  mocha: {
	timeout: 20000,
	ui: 'bdd',
	inlineDiffs: true,
	color: true
  },
});
