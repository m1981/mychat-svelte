import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: {requireAssertions: true},
		projects: [
			{
				test: {
					name: 'client-ut',
					environment: 'jsdom',  // Fast unit tests
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**', 'src/**/*.browser.{test,spec}.{js,ts}']
				}
			},
			{
				test: {
					name: 'client-browser',
					environment: 'browser',  // Component tests
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{browser: 'chromium'}]
					},
					include: ['src/**/*.browser.{test,spec}.{js,ts}']  // Name pattern for browser tests
				}
			},
			{
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/lib/server/**/*.{test,spec}.{js,ts}']
				}
			}
		]
	}
});