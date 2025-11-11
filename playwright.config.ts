import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm dev',
		port: 5174
	},
	testDir: 'tests',
	use: {
		baseURL: 'http://localhost:5174'
	},
	globalSetup: './tests/global-setup.ts',
	globalTeardown: './tests/global-teardown.ts'
});
