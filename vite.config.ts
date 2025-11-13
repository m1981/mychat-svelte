import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vitest/config';
import {sveltekit} from '@sveltejs/kit/vite';
import path from 'path';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
    test: {
        expect: {requireAssertions: true},
        projects: [
            {
                extends: './vite.config.ts',
                test: {
                    name: 'client-ut',
					environment: 'jsdom',
                    setupFiles: ['./vitest.setup.client.ts'],
                    include: ['src/**/*.{test,spec}.{js,ts}'],
                    exclude: [
                        'src/lib/server/**',
                        'src/**/*.browser.{test,spec}.{js,ts}'
                    ]
                }
            },
            {
                extends: './vite.config.ts',
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/lib/server/**/*.{test,spec}.{js,ts}']
                }
            },
            {
                extends: './vite.config.ts',
                test: {
                    name: 'browser',
                    environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
                    include: ['src/**/*.browser.{test,spec}.{js,ts}']
                }
            }
        ]
    }
});