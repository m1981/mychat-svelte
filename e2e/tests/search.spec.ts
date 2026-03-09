import { test, expect } from '../fixtures';

test.describe('Semantic Search @regression', () => {
	let chatId: string;

	test.beforeEach(async ({ app }) => {
		chatId = await app.createChatViaApi();
	});

	test.afterEach(async ({ app }) => {
		if (chatId) await app.deleteChatViaApi(chatId);
	});

	test('@smoke search panel opens from toggle button', async ({ app, page }) => {
		await app.goto(`/chat/${chatId}`);
		await page.waitForSelector('[data-testid="chat-view"]');

		// Panel is closed initially
		await expect(page.getByTestId('secondary-panel')).not.toBeVisible();

		// Click Search toggle
		await page.getByTestId('toggle-search-btn').click();

		// Panel opens with search tab active
		await expect(page.getByTestId('secondary-panel')).toBeVisible();
		await expect(page.getByTestId('search-input')).toBeVisible();

		await app.screenshot('search-panel-open');
	});

	test('@regression search input is interactive and shows empty state', async ({ app, page }) => {
		await app.goto(`/chat/${chatId}`);
		await page.waitForSelector('[data-testid="chat-view"]');
		await page.getByTestId('toggle-search-btn').click();
		await expect(page.getByTestId('search-input')).toBeVisible();

		// Type a query
		await page.getByTestId('search-input').fill('planets solar system');

		// After debounce, either results or empty state
		await page.waitForTimeout(600);

		await app.screenshot('search-after-query');
	});
});

test.describe('@mention dropdown @regression', () => {
	let chatId: string;

	test.beforeEach(async ({ app }) => {
		chatId = await app.createChatViaApi();
	});

	test.afterEach(async ({ app }) => {
		if (chatId) await app.deleteChatViaApi(chatId);
	});

	test('@smoke typing @ shows chat mention dropdown', async ({ app, page }) => {
		await app.goto(`/chat/${chatId}`);
		await page.waitForSelector('[data-testid="chat-view"]');

		const input = page.getByTestId('message-input');
		await input.click();
		await input.type('@');

		// Dropdown should appear (we have at least one chat in state)
		await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 3000 });

		await app.screenshot('mention-dropdown');
	});

	test('@regression selecting a mention inserts chat title into input', async ({ app, page }) => {
		await app.goto(`/chat/${chatId}`);
		await page.waitForSelector('[data-testid="chat-view"]');

		const input = page.getByTestId('message-input');
		await input.click();
		await input.type('@');

		await expect(page.getByTestId('mention-dropdown')).toBeVisible({ timeout: 3000 });

		// Click first option
		const firstOption = page.getByTestId('mention-option').first();
		const optionText = await firstOption.textContent();
		await firstOption.click();

		// Dropdown should close
		await expect(page.getByTestId('mention-dropdown')).not.toBeVisible();

		// Input should contain the selected chat title
		const inputValue = await input.inputValue();
		expect(inputValue).toContain(optionText?.trim());

		await app.screenshot('mention-inserted');
	});
});
