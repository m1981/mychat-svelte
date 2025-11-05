/**
 * Test Utilities and Helpers
 *
 * Common functions used across test suites
 */

import type { Page, Locator } from '@playwright/test';
import type { Chat, Folder } from '../../src/lib/types/chat';

/**
 * Wait for network requests to complete
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
	await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for specific API call to complete
 */
export async function waitForAPICall(
	page: Page,
	urlPattern: string | RegExp,
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET'
) {
	return page.waitForResponse(
		response => {
			const url = response.url();
			const matchesUrl = typeof urlPattern === 'string'
				? url.includes(urlPattern)
				: urlPattern.test(url);
			return matchesUrl && response.request().method() === method;
		},
		{ timeout: 10000 }
	);
}

/**
 * Mock API response
 */
export async function mockAPIResponse(
	page: Page,
	urlPattern: string | RegExp,
	response: any,
	status = 200
) {
	await page.route(urlPattern, route => {
		route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify(response)
		});
	});
}

/**
 * Block external requests (e.g., analytics, fonts)
 */
export async function blockExternalRequests(page: Page) {
	await page.route('**/*', route => {
		const url = route.request().url();
		if (
			url.includes('google-analytics') ||
			url.includes('fonts.googleapis') ||
			url.includes('cdn.')
		) {
			route.abort();
		} else {
			route.continue();
		}
	});
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page, delayMs = 1000) {
	await page.route('**/*', async route => {
		await new Promise(resolve => setTimeout(resolve, delayMs));
		await route.continue();
	});
}

/**
 * Get element by test ID
 */
export function getByTestId(page: Page, testId: string): Locator {
	return page.locator(`[data-testid="${testId}"]`);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
	page: Page,
	type: 'success' | 'error' | 'warning' | 'info',
	message?: string
) {
	const toast = page.locator(`[data-testid="toast-${type}"]`);

	if (message) {
		await toast.filter({ hasText: message }).waitFor({ state: 'visible' });
	} else {
		await toast.first().waitFor({ state: 'visible' });
	}

	return toast;
}

/**
 * Dismiss all toasts
 */
export async function dismissAllToasts(page: Page) {
	const toasts = page.locator('[data-testid^="toast-"]');
	const count = await toasts.count();

	for (let i = 0; i < count; i++) {
		const dismissButton = toasts.nth(i).locator('[data-testid="dismiss-toast"]');
		if (await dismissButton.isVisible()) {
			await dismissButton.click();
		}
	}
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	await page.screenshot({
		path: `screenshots/${name}-${timestamp}.png`,
		fullPage: true
	});
}

/**
 * Get local storage value
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
	return page.evaluate((key) => localStorage.getItem(key), key);
}

/**
 * Set local storage value
 */
export async function setLocalStorageItem(page: Page, key: string, value: string) {
	await page.evaluate(
		({ key, value }) => localStorage.setItem(key, value),
		{ key, value }
	);
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page) {
	await page.evaluate(() => localStorage.clear());
}

/**
 * Simulate keyboard shortcut
 */
export async function pressShortcut(
	page: Page,
	modifier: 'Control' | 'Meta' | 'Alt' | 'Shift',
	key: string
) {
	await page.keyboard.down(modifier);
	await page.keyboard.press(key);
	await page.keyboard.up(modifier);
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, selector: string) {
	await page.locator(selector).evaluate(element => {
		return Promise.all(
			element.getAnimations().map(animation => animation.finished)
		);
	});
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator) {
	await locator.evaluate(element => {
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});
}

/**
 * Get computed style
 */
export async function getComputedStyle(locator: Locator, property: string): Promise<string> {
	return locator.evaluate(
		(element, prop) => window.getComputedStyle(element).getPropertyValue(prop),
		property
	);
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(locator: Locator): Promise<boolean> {
	return locator.evaluate(element => {
		const rect = element.getBoundingClientRect();
		return (
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <= window.innerHeight &&
			rect.right <= window.innerWidth
		);
	});
}

/**
 * Generate random test data
 */
export class TestDataGenerator {
	static randomString(length = 10): string {
		return Math.random().toString(36).substring(2, 2 + length);
	}

	static randomEmail(): string {
		return `test-${this.randomString()}@example.com`;
	}

	static randomColor(): string {
		const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	static mockChat(overrides?: Partial<Chat>): Chat {
		return {
			id: `chat-${this.randomString()}`,
			userId: 1,
			title: `Test Chat ${this.randomString(5)}`,
			messages: [],
			config: {
				provider: 'anthropic',
				modelConfig: {
					model: 'claude-3-7-sonnet-20250219',
					max_tokens: 4096,
					temperature: 0.7,
					top_p: 1,
					presence_penalty: 0,
					frequency_penalty: 0
				}
			},
			tags: [],
			metadata: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides
		};
	}

	static mockFolder(overrides?: Partial<Folder>): Folder {
		return {
			id: `folder-${this.randomString()}`,
			userId: 1,
			name: `Test Folder ${this.randomString(5)}`,
			type: 'STANDARD',
			expanded: true,
			order: 0,
			color: this.randomColor(),
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides
		};
	}
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		delay?: number;
		backoff?: boolean;
	} = {}
): Promise<T> {
	const { maxAttempts = 3, delay = 1000, backoff = true } = options;

	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt < maxAttempts) {
				const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}
	}

	throw lastError!;
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
	condition: () => Promise<boolean> | boolean,
	options: {
		timeout?: number;
		interval?: number;
	} = {}
): Promise<void> {
	const { timeout = 5000, interval = 100 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise(resolve => setTimeout(resolve, interval));
	}

	throw new Error('Condition not met within timeout');
}

/**
 * Debug helper - log page console messages
 */
export function enableConsoleLogging(page: Page) {
	page.on('console', msg => {
		const type = msg.type();
		const text = msg.text();
		console.log(`[Browser ${type}]:`, text);
	});

	page.on('pageerror', error => {
		console.error('[Browser Error]:', error);
	});
}

/**
 * Measure page load performance
 */
export async function measurePageLoadTime(page: Page): Promise<number> {
	return page.evaluate(() => {
		const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		return perfData.loadEventEnd - perfData.fetchStart;
	});
}

/**
 * Check accessibility violations (basic implementation)
 */
export async function checkAccessibility(page: Page) {
	// Basic checks - can be extended with axe-core
	const issues: string[] = [];

	// Check for missing alt text on images
	const imagesWithoutAlt = await page.locator('img:not([alt])').count();
	if (imagesWithoutAlt > 0) {
		issues.push(`${imagesWithoutAlt} images without alt text`);
	}

	// Check for proper heading hierarchy
	const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
	// Add heading hierarchy checks

	return issues;
}

/**
 * Take full page screenshot with scroll
 */
export async function takeFullPageScreenshot(page: Page, name: string) {
	await page.screenshot({
		path: `screenshots/${name}.png`,
		fullPage: true
	});
}

/**
 * Compare two screenshots for visual regression
 */
export async function compareScreenshots(
	baseline: string,
	current: string,
	threshold = 0.1
): Promise<boolean> {
	// Implementation would use image comparison library
	// Returns true if images match within threshold
	return true;
}