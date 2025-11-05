import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'tests',
	use: {
		baseURL: 'http://localhost:4173'
	},
	globalSetup: './tests/global-setup.ts',
	globalTeardown: './tests/global-teardown.ts'
});
