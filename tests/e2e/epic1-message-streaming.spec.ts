import { test, expect } from '../fixtures';

/**
 * Epic 1: Core Chat Interaction - Message Streaming Contract
 *
 * This test validates the complete user journey for core chat interactions.
 *
 * REFACTOR: Replaced verbose console.log statements with `test.step()`.
 * This creates a structured, readable report in the Playwright UI,
 * making the test flow clear without cluttering the console.
 */

test.describe('Epic 1: Message Streaming Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Start from a clean slate for each test in this suite
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('should complete full message streaming flow from new chat to AI response', async ({
		page,
		sidebarPage,
		chatPage
	}) => {
		let chatId: string;

		await test.step('STEP 1: Create New Chat', async () => {
			await sidebarPage.newChatButton.click();
			await page.waitForURL(/\/chat\/chat-.+/);
			await chatPage.waitForPageLoad();

			chatId = page.url().split('/chat/')[1];
			expect(chatId).toMatch(/^chat-\d+-[a-z0-9]+$/);
		});

		await test.step('STEP 2: Verify Empty Chat State', async () => {
			await expect(chatPage.chatTitle).toContainText('New Chat', { timeout: 10000 });
			await expect(page.locator('text=No messages yet')).toBeVisible();
			await expect(chatPage.messageInput).toBeEnabled();
		});

		await test.step('STEP 3: Send User Message and Verify UI State', async () => {
			const testMessage = 'Hello! Please respond with a short greeting.';
			await chatPage.sendMessage(testMessage);

			// User message should appear immediately
			await expect(chatPage.messagesList.locator(`text=${testMessage}`)).toBeVisible({
				timeout: 2000
			});

			// Composer should be disabled during streaming
			await expect(chatPage.messageInput).toBeDisabled();
			await expect(chatPage.sendButton.locator('.loading-spinner')).toBeVisible();
		});

		await test.step('STEP 4: Monitor Streaming Response and Completion', async () => {
			// Assistant message placeholder with loading indicator should appear
			const loadingIndicator = page.locator('[data-testid="ai-loading"]');
			await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

			// Wait for the stream to complete
			await chatPage.waitForAIResponseCompletion();

			// Verify the final state
			const assistantMessage = chatPage.messagesList.locator('[data-testid="message"]').last();
			const finalContent = await assistantMessage.textContent();
			expect(finalContent).toBeTruthy();
			expect(finalContent!.length).toBeGreaterThan(10);
		});

		await test.step('STEP 5: Verify UI is Re-enabled', async () => {
			await expect(chatPage.messageInput).toBeEnabled({ timeout: 2000 });
			await expect(chatPage.sendButton.locator('.loading-spinner')).not.toBeVisible();
		});

		await test.step('STEP 6: Verify Chat Persistence on Reload', async () => {
			const userMessageText = 'Hello! Please respond with a short greeting.';
			const assistantMessage = chatPage.messagesList.locator('[data-testid="message"]').last();
			const assistantMessageText = (await assistantMessage.textContent()) || '';

			await page.reload();
			await chatPage.waitForPageLoad();

			// Should still be on the same chat page
			expect(page.url()).toContain(chatId);

			// Messages should be preserved
			await expect(chatPage.messagesList.locator(`text=${userMessageText}`)).toBeVisible();
			await expect(
				chatPage.messagesList.locator(`text=${assistantMessageText}`)
			).toBeVisible();
		});

		await test.step('STEP 7: Verify a Second Message Works Correctly', async () => {
			const secondMessage = 'Thank you!';
			await chatPage.sendMessage(secondMessage);

			// Second user message should appear
			await expect(chatPage.messagesList.locator(`text=${secondMessage}`)).toBeVisible({
				timeout: 2000
			});

			// A new assistant response should start streaming
			const loadingIndicator = page.locator('[data-testid="ai-loading"]');
			await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

			// Wait for the second stream to complete
			await chatPage.waitForAIResponseCompletion();

			// Verify there are now 4 messages total (user, ai, user, ai)
			await expect(chatPage.messagesList.locator('[data-testid="message"]')).toHaveCount(4);
		});
	});

	test('should handle streaming from sidebar "New Chat" button', async ({
		page,
		sidebarPage,
		chatPage
	}) => {
		await test.step('Create new chat from sidebar', async () => {
			await sidebarPage.newChatButton.click();
			await page.waitForURL(/\/chat\/chat-.+/);
			await expect(page.locator('text=No messages yet')).toBeVisible({ timeout: 5000 });
		});

		await test.step('Send message and verify streaming starts', async () => {
			const testMessage = 'Quick test from sidebar';
			await chatPage.sendMessage(testMessage);

			// Verify user message appears
			const userMsg = chatPage.messagesList.locator(`text=${testMessage}`);
			await expect(userMsg).toBeVisible({ timeout: 2000 });

			// Verify assistant response starts and loading indicator is visible
			const assistantMsg = chatPage.messagesList.locator('[data-testid="message"]').last();
			await expect(assistantMsg).toBeVisible({ timeout: 5000 });
			const loadingIndicator = page.locator('[data-testid="ai-loading"]');
			await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
		});

		await test.step('Wait for streaming to complete', async () => {
			await chatPage.waitForAIResponseCompletion();
			await expect(chatPage.messageInput).toBeEnabled();
		});
	});

	test('should maintain correct UI state during streaming', async ({ page, sidebarPage, chatPage }) => {
		await test.step('Start a new chat and send a message', async () => {
			await sidebarPage.newChatButton.click();
			await page.waitForURL(/\/chat\//);
			await chatPage.sendMessage('Test state management during a long response.');
		});

		await test.step('Verify UI is disabled while streaming', async () => {
			// Wait for streaming to start
			const loadingIndicator = page.locator('[data-testid="ai-loading"]');
			await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

			// Assert that input and button are in the correct "in-progress" state
			await expect(chatPage.messageInput).toBeDisabled();
			await expect(chatPage.sendButton.locator('.loading-spinner')).toBeVisible();
		});

		await test.step('Verify UI is re-enabled after streaming completes', async () => {
			// Wait for the response to finish
			await chatPage.waitForAIResponseCompletion();

			// Give a moment for UI state to update post-stream
			await page.waitForTimeout(500);

			// Assert that input and button are restored to their normal state
			await expect(chatPage.messageInput).toBeEnabled({ timeout: 5000 });
			await expect(chatPage.sendButton.locator('.loading-spinner')).not.toBeVisible();
		});
	});
});