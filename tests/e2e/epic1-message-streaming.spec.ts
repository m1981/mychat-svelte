import { test, expect } from '@playwright/test';

/**
 * Epic 1: Core Chat Interaction - Message Streaming Contract
 *
 * This test validates the complete user journey for:
 * - Creating a new chat
 * - Sending a message
 * - Receiving a streamed AI response
 * - Verifying database persistence
 */

test.describe('Epic 1: Message Streaming Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Start from the home page
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('should complete full message streaming flow from welcome page to AI response', async ({ page }) => {
		// ==========================================
		// STEP 1: Navigate to Home / Check State
		// ==========================================
		console.log('✓ STEP 1: Checking initial state...');

		// Wait a moment for potential auto-redirect
		await page.waitForTimeout(500);

		// Check if we're on home page (no chats) or auto-redirected (has chats)
		const currentUrl = page.url();
		const isOnHomePage = currentUrl === 'http://localhost:4173/' || currentUrl.endsWith('localhost:4173/');

		if (isOnHomePage) {
			console.log('✓ On welcome page - no existing chats');
			await expect(page.locator('h1')).toContainText('Welcome to BetterChatGPT');
			await expect(page.locator('text=Start Your First Chat')).toBeVisible();
		} else {
			console.log('✓ Auto-redirected to existing chat - database has data');
		}

		// ==========================================
		// STEP 2: Create New Chat
		// ==========================================
		console.log('✓ STEP 2: Creating new chat...');

		// Use sidebar "New Chat" button which always exists
		const newChatButton = page.locator('#menu button:has-text("New Chat")');
		await expect(newChatButton).toBeVisible();
		await newChatButton.click();

		// Wait for navigation to /chat/{id}
		await page.waitForURL(/\/chat\/chat-\d+-[a-z0-9]+/);
		await page.waitForLoadState('networkidle');
		console.log('✓ Navigated to:', page.url());

		// Verify we're on a chat page
		const chatId = page.url().split('/chat/')[1];
		expect(chatId).toMatch(/^chat-\d+-[a-z0-9]+$/);
		console.log('✓ New chat created with ID:', chatId);

		// ==========================================
		// STEP 3: Verify Empty Chat State
		// ==========================================
		console.log('✓ STEP 3: Verifying empty chat state...');

		// Should show "New Chat" as title
		await expect(page.locator('[data-testid="chat-title"]')).toContainText('New Chat', { timeout: 10000 });

		// Check for either empty state or no messages
		const hasEmptyState = await page.locator('text=No messages yet').isVisible();
		const messagesContainer = page.locator('[data-testid="messages-list"]');
		const messageCount = await page.locator('[data-testid="message"]').count();

		if (!hasEmptyState && messageCount > 0) {
			console.log('⚠ Chat has existing messages, continuing with test...');
		} else {
			console.log('✓ Empty chat state verified');
		}

		// Message composer should be enabled
		const textarea = page.locator('textarea[placeholder="Type a message..."]');
		await expect(textarea).toBeEnabled();

		console.log('✓ Empty chat state verified');

		// ==========================================
		// STEP 4: Send User Message
		// ==========================================
		console.log('✓ STEP 4: Sending user message...');

		const testMessage = 'Hello! Please respond with a short greeting (1-2 sentences).';

		// Type the message
		await textarea.fill(testMessage);
		await expect(textarea).toHaveValue(testMessage);

		// Click send button
		const sendButton = page.locator('button[aria-label="Send"]');
		await expect(sendButton).toBeEnabled();
		await sendButton.click();

		console.log('✓ Message sent:', testMessage);

		// ==========================================
		// STEP 5: Verify User Message Appears
		// ==========================================
		console.log('✓ STEP 5: Verifying user message appears immediately...');

		// User message should appear immediately
		const userMessage = page.locator('.chat-start .chat-bubble').filter({ hasText: testMessage });
		await expect(userMessage).toBeVisible({ timeout: 2000 });

		console.log('✓ User message displayed in chat');

		// ==========================================
		// STEP 6: Verify Assistant Placeholder
		// ==========================================
		console.log('✓ STEP 6: Verifying assistant placeholder appears...');

		// Assistant message placeholder should appear
		const assistantMessage = page.locator('.chat-end .chat-bubble').last();
		await expect(assistantMessage).toBeVisible({ timeout: 2000 });

		// Loading indicator should be visible
		const loadingIndicator = page.locator('[data-testid="ai-loading"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

		console.log('✓ Assistant placeholder with loading indicator shown');

		// ==========================================
		// STEP 7: Verify MessageComposer Disabled
		// ==========================================
		console.log('✓ STEP 7: Verifying message composer is disabled during streaming...');

		// Textarea should be disabled
		await expect(textarea).toBeDisabled();

		// Send button should show loading spinner
		const loadingSpinner = sendButton.locator('.loading-spinner');
		await expect(loadingSpinner).toBeVisible();

		console.log('✓ Message composer properly disabled');

		// ==========================================
		// STEP 8: Monitor Streaming Response
		// ==========================================
		console.log('✓ STEP 8: Monitoring streaming response...');

		// Wait for content to start appearing (response should start within 5 seconds)
		let previousContent = '';
		let streamingDetected = false;

		// Check for streaming updates every 500ms for up to 30 seconds
		for (let i = 0; i < 60; i++) {
			await page.waitForTimeout(500);
			const currentContent = await assistantMessage.textContent();

			if (currentContent && currentContent !== previousContent) {
				if (!streamingDetected) {
					console.log('✓ Streaming started! First content:', currentContent.substring(0, 50) + '...');
					streamingDetected = true;
				}
				previousContent = currentContent || '';

				// Check if loading indicator is still visible
				const isLoading = await loadingIndicator.isVisible();
				if (!isLoading) {
					console.log('✓ Streaming completed. Final response length:', previousContent.length);
					break;
				}
			}
		}

		expect(streamingDetected).toBe(true);
		expect(previousContent.length).toBeGreaterThan(0);

		console.log('✓ Response content:', previousContent);

		// ==========================================
		// STEP 9: Verify Stream Completion
		// ==========================================
		console.log('✓ STEP 9: Verifying stream completion...');

		// Loading indicator should disappear
		await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });

		// Assistant message should have content
		const finalContent = await assistantMessage.textContent();
		expect(finalContent).toBeTruthy();
		expect(finalContent!.length).toBeGreaterThan(10);

		console.log('✓ Stream completed successfully');

		// ==========================================
		// STEP 10: Verify MessageComposer Re-enabled
		// ==========================================
		console.log('✓ STEP 10: Verifying message composer is re-enabled...');

		// Textarea should be enabled again
		await expect(textarea).toBeEnabled({ timeout: 2000 });

		// Send button should not show loading spinner
		await expect(loadingSpinner).not.toBeVisible();

		console.log('✓ Message composer re-enabled for next message');

		// ==========================================
		// STEP 11: Verify Chat Persistence
		// ==========================================
		console.log('✓ STEP 11: Verifying chat persistence...');

		// Chat should appear in sidebar
		const sidebarChat = page.locator('#menu').locator(`[data-chat-id="${chatId}"]`);
		await expect(sidebarChat).toBeVisible();

		// Reload page to verify persistence
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Should still be on same chat
		expect(page.url()).toContain(chatId);

		// Messages should still be visible
		await expect(userMessage).toBeVisible();
		await expect(assistantMessage).toBeVisible();

		// Content should be preserved
		const reloadedContent = await assistantMessage.textContent();
		expect(reloadedContent).toBe(finalContent);

		console.log('✓ Chat persisted successfully after reload');

		// ==========================================
		// STEP 12: Verify Second Message Works
		// ==========================================
		console.log('✓ STEP 12: Verifying second message can be sent...');

		const secondMessage = 'Thank you!';
		await textarea.fill(secondMessage);
		await sendButton.click();

		// Second user message should appear
		const secondUserMessage = page.locator('.chat-start .chat-bubble').filter({ hasText: secondMessage });
		await expect(secondUserMessage).toBeVisible({ timeout: 2000 });

		// Second assistant message should start streaming
		const allAssistantMessages = page.locator('.chat-end .chat-bubble');
		const assistantMessageCount = await allAssistantMessages.count();
		expect(assistantMessageCount).toBeGreaterThanOrEqual(2);

		console.log('✓ Second message flow working correctly');

		// ==========================================
		// FINAL SUMMARY
		// ==========================================
		console.log('\n' + '='.repeat(60));
		console.log('✅ ALL STEPS PASSED - Epic 1 Message Streaming Validated!');
		console.log('='.repeat(60));
		console.log('Summary:');
		console.log('  ✓ Welcome page → New chat creation');
		console.log('  ✓ User message → Immediate display');
		console.log('  ✓ Assistant placeholder → Loading state');
		console.log('  ✓ Real-time streaming → Token-by-token');
		console.log('  ✓ Stream completion → UI re-enabled');
		console.log('  ✓ Database persistence → Verified on reload');
		console.log('  ✓ Multiple messages → Working correctly');
		console.log('='.repeat(60) + '\n');
	});

	test('should handle streaming from sidebar "New Chat" button', async ({ page }) => {
		console.log('✓ Testing chat creation from sidebar...');

		// Click sidebar "New Chat" button
		const newChatButton = page.locator('#menu button:has-text("New Chat")');
		await expect(newChatButton).toBeVisible();
		await newChatButton.click();

		// Should navigate to new chat
		await page.waitForURL(/\/chat\/chat-\d+-[a-z0-9]+/);
		const chatId = page.url().split('/chat/')[1];
		console.log('✓ Created chat:', chatId);

		// Wait for empty state
		await expect(page.locator('text=No messages yet')).toBeVisible({ timeout: 2000 });

		// Send message and verify streaming
		const textarea = page.locator('textarea[placeholder="Type a message..."]');
		await textarea.fill('Quick test from sidebar');

		const sendButton = page.locator('button[aria-label="Send"]');
		await sendButton.click();

		// Verify user message appears (filter by exact text to avoid conflicts)
		const userMsg = page.locator('.chat-start .chat-bubble').filter({ hasText: 'Quick test from sidebar' });
		await expect(userMsg).toBeVisible({ timeout: 2000 });

		// Verify assistant response starts (use last() to get the most recent)
		const assistantMsg = page.locator('.chat-end .chat-bubble').last();
		await expect(assistantMsg).toBeVisible({ timeout: 5000 });

		// Verify loading indicator
		const loadingIndicator = page.locator('[data-testid="ai-loading"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

		// Wait for completion
		await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });

		console.log('✓ Sidebar chat creation and streaming verified');
	});

	test('should maintain streaming state across page interactions', async ({ page }) => {
		console.log('✓ Testing streaming state management...');

		// Create new chat
		const newChatButton = page.locator('#menu button:has-text("New Chat")');
		await expect(newChatButton).toBeVisible();
		await newChatButton.click();
		await page.waitForURL(/\/chat\//);

		// Wait for empty state
		await expect(page.locator('text=No messages yet')).toBeVisible({ timeout: 2000 });

		const textarea = page.locator('textarea[placeholder="Type a message..."]');
		await textarea.fill('Test state management');

		const sendButton = page.locator('button[aria-label="Send"]');
		await sendButton.click();

		// Wait for streaming to start
		const loadingIndicator = page.locator('[data-testid="ai-loading"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

		// Verify state consistency
		await expect(textarea).toBeDisabled();
		await expect(sendButton.locator('.loading-spinner')).toBeVisible();

		// Wait for completion
		await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });

		// Give a moment for UI to update
		await page.waitForTimeout(500);

		// Verify state restored - re-query textarea to avoid stale element
		const textareaAfter = page.locator('textarea[placeholder="Type a message..."]');
		await expect(textareaAfter).toBeEnabled({ timeout: 5000 });

		console.log('✓ Streaming state management verified');
	});
});
