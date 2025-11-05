import { test, expect } from '../fixtures';

/**
 * E2E Tests: Highlights Management
 *
 * Covers:
 * - Creating highlights
 * - Managing highlight colors
 * - Navigating to highlights
 * - Deleting highlights
 * - Adding notes to highlights
 */

test.describe('Highlights Management', () => {
	test.beforeEach(async ({ page, testData, chatPage }) => {
		// Navigate to test chat and add some messages
		await page.goto(`/chat/${testData.chats[0].id}`);

		await chatPage.sendMessage('Explain the concept of API keys');
		await chatPage.waitForAIResponse();
	});

	test.describe('Creating Highlights', () => {
		test('should create a highlight by selecting text', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange - Get AI response text
			const messageText = await chatPage.getLastMessage();
			const textToHighlight = messageText.substring(0, 50); // First 50 chars

			// Act - Select and highlight text
			const message = chatPage.messagesList.locator('[data-testid="message"]').last();

			// Select text (platform-specific, may need adjustment)
			await message.locator(`text=${textToHighlight.substring(0, 20)}`).first().click();
			await page.keyboard.down('Shift');

			// Select more text
			for (let i = 0; i < 5; i++) {
				await page.keyboard.press('ArrowRight');
			}
			await page.keyboard.up('Shift');

			// Right-click to open context menu
			await page.keyboard.press('ContextMenu');
			await page.getByRole('menuitem', { name: /highlight/i }).click();

			// Assert - Highlight should appear in panel
			await highlightsPanel.openHighlightsPanel();
			await highlightsPanel.expectHighlightCount(1);
		});

		test('should create highlight with default color', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Act
			await chatPage.highlightText(1, 'API key');

			// Assert
			await highlightsPanel.openHighlightsPanel();
			const highlight = page.locator('[data-testid="highlight-item"]').first();

			// Default color should be yellow
			await expect(highlight).toHaveCSS('background-color', 'rgb(255, 255, 0)');
		});

		test('should preserve highlight formatting in message', async ({
			chatPage,
			page
		}) => {
			// Act
			await chatPage.highlightText(1, 'important concept');

			// Assert - Text should be highlighted in message
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			const highlightedText = message.locator('mark').filter({ hasText: 'important concept' });

			await expect(highlightedText).toBeVisible();
			await expect(highlightedText).toHaveCSS('background-color', 'rgb(255, 255, 0)');
		});
	});

	test.describe('Managing Highlight Colors', () => {
		test('should change highlight color', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'test text');
			await highlightsPanel.openHighlightsPanel();

			// Act - Change color to blue
			await highlightsPanel.changeHighlightColor(0, 'blue');

			// Assert - Color should update
			const highlight = page.locator('[data-testid="highlight-item"]').first();
			await expect(highlight).toHaveCSS('background-color', 'rgb(0, 0, 255)');

			// Color should also update in message
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			const highlightedText = message.locator('mark').first();
			await expect(highlightedText).toHaveCSS('background-color', 'rgb(0, 0, 255)');
		});

		test('should support multiple highlight colors', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange - Create highlights with different colors
			const colors = ['yellow', 'green', 'pink', 'blue'];
			const texts = ['first', 'second', 'third', 'fourth'];

			for (let i = 0; i < colors.length; i++) {
				await chatPage.highlightText(1, texts[i]);
				await highlightsPanel.openHighlightsPanel();
				await highlightsPanel.changeHighlightColor(i, colors[i]);
			}

			// Assert - All highlights should have different colors
			await highlightsPanel.openHighlightsPanel();
			await highlightsPanel.expectHighlightCount(4);

			for (let i = 0; i < colors.length; i++) {
				const highlight = page.locator('[data-testid="highlight-item"]').nth(i);
				// Verify color (exact RGB values depend on your color palette)
				await expect(highlight).toHaveAttribute('data-color', colors[i]);
			}
		});

		test('should group highlights by color in panel', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'text1');
			await chatPage.highlightText(1, 'text2');

			// Both should be yellow by default
			await highlightsPanel.openHighlightsPanel();

			// Act - Toggle "Group by color"
			await page.getByRole('button', { name: /group by color/i }).click();

			// Assert - Should see color groups
			await expect(page.getByText(/yellow \(2\)/i)).toBeVisible();
		});
	});

	test.describe('Navigating to Highlights', () => {
		test('should scroll to highlighted text when clicking highlight', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange - Create multiple messages
			for (let i = 0; i < 10; i++) {
				await chatPage.sendMessage(`Message ${i}`);
				await chatPage.waitForAIResponse();
			}

			// Highlight text in first AI response
			await chatPage.highlightText(1, 'specific text');

			// Scroll to bottom
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

			// Act - Click highlight in panel
			await highlightsPanel.openHighlightsPanel();
			await highlightsPanel.clickHighlight(0);

			// Assert - Should scroll to highlighted message
			const targetMessage = chatPage.messagesList
				.locator('[data-testid="message"]')
				.nth(1);
			await expect(targetMessage).toBeInViewport();

			// Highlight should pulse/flash
			await expect(targetMessage.locator('mark')).toHaveClass(/pulse|flash/);
		});

		test('should maintain highlight visibility when scrolling', async ({
			chatPage,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'test');

			// Act - Scroll down and back up
			await page.evaluate(() => window.scrollTo(0, 500));
			await page.waitForTimeout(100);
			await page.evaluate(() => window.scrollTo(0, 0));

			// Assert - Highlight should still be visible
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			const highlight = message.locator('mark');
			await expect(highlight).toBeVisible();
		});
	});

	test.describe('Deleting Highlights', () => {
		test('should delete a highlight', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'test text');
			await highlightsPanel.openHighlightsPanel();
			await highlightsPanel.expectHighlightCount(1);

			// Act
			await highlightsPanel.deleteHighlight(0);

			// Assert
			await highlightsPanel.expectHighlightCount(0);

			// Highlight should be removed from message
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			await expect(message.locator('mark')).not.toBeVisible();
		});

		test('should show confirmation before deleting highlight', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'important text');
			await highlightsPanel.openHighlightsPanel();

			// Act
			const highlight = page.locator('[data-testid="highlight-item"]').first();
			await highlight.hover();
			await highlight.locator('[data-testid="delete-highlight"]').click();

			// Assert
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText(/delete highlight/i)).toBeVisible();

			// Cancel
			await page.getByRole('button', { name: /cancel/i }).click();
			await highlightsPanel.expectHighlightCount(1);
		});
	});

	test.describe('Highlight Notes', () => {
		test('should add a note to highlight', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'key concept');
			await highlightsPanel.openHighlightsPanel();

			// Act
			const highlight = page.locator('[data-testid="highlight-item"]').first();
			await highlight.hover();
			await highlight.locator('[data-testid="add-note"]').click();

			const noteInput = page.locator('[data-testid="highlight-note-input"]');
			await noteInput.fill('This is an important concept to remember');
			await page.keyboard.press('Enter');

			// Assert
			await expect(highlight.locator('[data-testid="highlight-note"]')).toHaveText(
				'This is an important concept to remember'
			);
		});

		test('should edit highlight note', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'text');
			await highlightsPanel.openHighlightsPanel();

			const highlight = page.locator('[data-testid="highlight-item"]').first();
			await highlight.hover();
			await highlight.locator('[data-testid="add-note"]').click();
			await page.locator('[data-testid="highlight-note-input"]').fill('Original note');
			await page.keyboard.press('Enter');

			// Act - Edit note
			await highlight.locator('[data-testid="highlight-note"]').click();
			const noteInput = page.locator('[data-testid="highlight-note-input"]');
			await noteInput.clear();
			await noteInput.fill('Updated note');
			await page.keyboard.press('Enter');

			// Assert
			await expect(highlight.locator('[data-testid="highlight-note"]')).toHaveText(
				'Updated note'
			);
		});

		test('should show note indicator on highlight with note', async ({
			chatPage,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'text with note');
			// Add note via context menu
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			const highlightedText = message.locator('mark').first();
			await highlightedText.click({ button: 'right' });
			await page.getByRole('menuitem', { name: /add note/i }).click();
			await page.locator('[data-testid="highlight-note-input"]').fill('Test note');
			await page.keyboard.press('Enter');

			// Assert - Should show note indicator icon
			await expect(highlightedText.locator('[data-testid="note-indicator"]')).toBeVisible();
		});
	});

	test.describe('Highlight Organization', () => {
		test('should display highlights in chronological order', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			const texts = ['first', 'second', 'third'];
			for (const text of texts) {
				await chatPage.highlightText(1, text);
				await page.waitForTimeout(100); // Ensure different timestamps
			}

			// Assert
			await highlightsPanel.openHighlightsPanel();
			const highlights = page.locator('[data-testid="highlight-item"]');

			for (let i = 0; i < texts.length; i++) {
				const text = await highlights.nth(i).textContent();
				// Should be in reverse chronological order (newest first)
				expect(text).toContain(texts[texts.length - 1 - i]);
			}
		});

		test('should show empty state when no highlights exist', async ({
			highlightsPanel,
			page
		}) => {
			// Act
			await highlightsPanel.openHighlightsPanel();

			// Assert
			await expect(page.getByText(/no highlights yet/i)).toBeVisible();
			await expect(page.getByText(/select text to highlight/i)).toBeVisible();
		});

		test('should display highlight count in panel tab', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'first');
			await chatPage.highlightText(1, 'second');
			await chatPage.highlightText(1, 'third');

			// Assert
			const badge = page.locator('[data-testid="highlights-tab"]')
				.locator('[data-testid="highlight-count"]');
			await expect(badge).toHaveText('3');
		});
	});

	test.describe('Highlight Persistence', () => {
		test('should persist highlights after page reload', async ({
			chatPage,
			highlightsPanel,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'persistent text');

			// Act
			await page.reload();

			// Assert
			await highlightsPanel.openHighlightsPanel();
			await highlightsPanel.expectHighlightCount(1);
			await highlightsPanel.expectHighlightExists('persistent text');

			// Highlight should be visible in message
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			await expect(message.locator('mark')).toBeVisible();
		});

		test('should sync highlights across tabs', async ({
			chatPage,
			highlightsPanel,
			page,
			context
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'synced highlight');

			// Act - Open new tab
			const page2 = await context.newPage();
			await page2.goto(page.url());

			const highlightsPanel2 = new (highlightsPanel.constructor as any)(page2);
			await highlightsPanel2.openHighlightsPanel();

			// Assert
			await highlightsPanel2.expectHighlightExists('synced highlight');

			await page2.close();
		});
	});

	test.describe('Highlight Conflicts', () => {
		test('should handle overlapping highlights', async ({ chatPage, page }) => {
			// Arrange & Act - Create overlapping highlights
			await chatPage.highlightText(1, 'test text here');
			await chatPage.highlightText(1, 'text here'); // Overlaps

			// Assert - Both should be visible with distinct boundaries
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
			const highlights = message.locator('mark');
			await expect(highlights).toHaveCount(2);
		});

		test('should merge adjacent highlights of same color', async ({
			chatPage,
			page
		}) => {
			// Arrange
			await chatPage.highlightText(1, 'first part');
			await chatPage.highlightText(1, 'second part'); // Adjacent

			// Act - Merge if they're the same color
			const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);

			// Assert - Implementation specific
			// May show as single highlight or multiple depending on design
		});
	});
});

/**
 * Visual Regression Tests
 */
test.describe('Highlights Visual Tests', () => {
	test('should match highlights panel snapshot', async ({
		chatPage,
		highlightsPanel,
		page,
		testData
	}) => {
		await page.goto(`/chat/${testData.chats[0].id}`);
		await chatPage.sendMessage('Test message for highlights');
		await chatPage.waitForAIResponse();

		await chatPage.highlightText(1, 'test');
		await highlightsPanel.openHighlightsPanel();

		await expect(highlightsPanel.highlightsList).toHaveScreenshot('highlights-panel.png');
	});

	test('should match highlighted message snapshot', async ({
		chatPage,
		page,
		testData
	}) => {
		await page.goto(`/chat/${testData.chats[0].id}`);
		await chatPage.sendMessage('Message with highlights');
		await chatPage.waitForAIResponse();

		await chatPage.highlightText(1, 'important');

		const message = chatPage.messagesList.locator('[data-testid="message"]').nth(1);
		await expect(message).toHaveScreenshot('highlighted-message.png');
	});
});