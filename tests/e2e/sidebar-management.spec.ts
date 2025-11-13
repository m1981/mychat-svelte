import { test, expect } from '../fixtures';

/**
 * E2E Tests for Critical Sidebar Management Components
 *
 * Covers the behavior of:
 * - ChatHistory.svelte (renaming, deleting)
 * - ChatFolder.svelte (renaming, deleting)
 *
 * These tests validate the user-facing behavior, which implicitly proves
 * that the underlying local-first store actions are being triggered correctly.
 */

test.describe('Sidebar Management', () => {
	// GIVEN: Before each test, we navigate to the home page with pre-seeded data.
	// This ensures each test is ISOLATED and starts from a known state.
	test.beforeEach(async ({ page, testData }) => {
		// The `testData` fixture automatically seeds a 'Work' folder and 'Test Chat 1' inside it.
		await page.goto('/');
		// Wait for the app to be fully loaded and idle.
		await page.waitForLoadState('networkidle');
	});

	test.describe('Chat Management (ChatHistory.svelte)', () => {

		// Test ONE THING: Renaming a chat successfully.
		test('should rename a chat and persist the new name', async ({ sidebarPage, page }) => {
			const originalTitle = 'Test Chat 1';
			const newTitle = 'Updated Test Chat';

			// WHEN: The user renames the chat.
			await sidebarPage.renameChat(originalTitle, newTitle);

			// THEN: The chat with the new title should be visible.
			await sidebarPage.expectChatExists(newTitle);
			// AND: The chat with the old title should no longer exist.
			await sidebarPage.expectChatExists(originalTitle, { isVisible: false });

			// AND: The change should be MAINTAINABLE and persist after a reload.
			await page.reload();
			await page.waitForLoadState('networkidle');
			await sidebarPage.expectChatExists(newTitle);
		});

		// Test ONE THING: Deleting a chat.
		test('should delete a chat after confirmation', async ({ sidebarPage }) => {
			const chatToDelete = 'Test Chat 1';

			// WHEN: The user deletes the chat and confirms the action.
			await sidebarPage.deleteChat(chatToDelete);

			// THEN: The chat should no longer be visible in the sidebar.
			await sidebarPage.expectChatExists(chatToDelete, { isVisible: false });
		});

		// Test ONE THING: Attempting to rename a chat to an empty title.
		// This tests BEHAVIOR (user feedback) not implementation (how the validation works).
		test('should not allow renaming a chat to an empty title', async ({ sidebarPage, page }) => {
			const originalTitle = 'Test Chat 1';

			// WHEN: The user attempts to rename the chat to an empty string.
			await sidebarPage.renameChat(originalTitle, '');

			// THEN: The chat should retain its original title.
			await sidebarPage.expectChatExists(originalTitle);

			// AND: A warning toast should be displayed to the user.
			const toast = page.locator('[data-testid="toast-warning"]');
			await expect(toast).toBeVisible();
			await expect(toast).toContainText('Chat title cannot be empty');
		});
	});

	test.describe('Folder Management (ChatFolder.svelte)', () => {

		// Test ONE THING: Renaming a folder successfully.
		test('should rename a folder and persist the new name', async ({ sidebarPage, page }) => {
			const originalName = 'Work';
			const newName = 'Client Projects';

			// WHEN: The user renames the folder.
			await sidebarPage.renameFolder(originalName, newName);

			// THEN: The folder with the new name should be visible.
			await sidebarPage.expectFolderExists(newName);
			// AND: The folder with the old name should no longer exist.
			await sidebarPage.expectFolderExists(originalName, { isVisible: false });

			// AND: The change should persist after a reload.
			await page.reload();
			await page.waitForLoadState('networkidle');
			await sidebarPage.expectFolderExists(newName);
		});

		// Test ONE THING: Deleting a folder that contains chats.
		test('should delete a folder and move its chats to the root', async ({ sidebarPage }) => {
			const folderToDelete = 'Work';
			const chatInside = 'Test Chat 1';

			// Pre-condition check: Ensure the chat is inside the folder.
			const folderItem = sidebarPage.getFolderItem(folderToDelete);
			await expect(folderItem.locator(`text=${chatInside}`)).toBeVisible();

			// WHEN: The user deletes the folder and confirms.
			await sidebarPage.deleteFolder(folderToDelete);

			// THEN: The folder should no longer exist.
			await sidebarPage.expectFolderExists(folderToDelete, { isVisible: false });
			// AND: The chat that was inside should now be visible at the root level.
			await sidebarPage.expectChatExists(chatInside);
			// Verify it's no longer nested.
			const rootChatList = sidebarPage.page.locator('[data-testid="chats-list"] > .chat-history-item');
			await expect(rootChatList.filter({ hasText: chatInside })).toBeVisible();
		});
	});
});