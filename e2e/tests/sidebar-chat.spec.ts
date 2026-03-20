import { test, expect } from '../fixtures';

test.describe('Sidebar Chat Management', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) {
      await app.deleteChatViaApi(chatId).catch(() => {});
      chatId = '';
    }
  });

  test('@smoke sidebar shows a newly created chat after page load', async ({ app, sidebar, page }) => {
    chatId = await app.createChatViaApi();

    await app.goto('/');
    await page.reload();
    await app.screenshot('sidebar-chat-appears-initial');

    const item = sidebar.chatItem(chatId);
    await expect(item).toBeVisible();
    await app.screenshot('sidebar-chat-appears-visible');

    const title = sidebar.chatTitle(chatId);
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    console.log(`Chat title in sidebar: "${titleText}"`);
  });

  test('@regression user can rename a chat from the sidebar', async ({ app, sidebar, page }) => {
    chatId = await app.createChatViaApi();

    await app.goto('/');
    await page.reload();

    const item = sidebar.chatItem(chatId);
    await expect(item).toBeVisible();

    await app.screenshot('sidebar-chat-rename-before');

    await sidebar.renameChat(chatId, 'Renamed Chat');

    // Wait for the rename to persist
    await page.waitForTimeout(500);
    await page.reload();

    await app.screenshot('sidebar-chat-rename-after');

    const title = sidebar.chatTitle(chatId);
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Renamed Chat');

    // Verify via API
    const chat = await app.getChatViaApi(chatId);
    expect(chat.title).toBe('Renamed Chat');
  });

  test('@regression user can delete a chat from the sidebar', async ({ app, sidebar, page }) => {
    chatId = await app.createChatViaApi();

    await app.goto('/');
    await page.reload();

    const item = sidebar.chatItem(chatId);
    await expect(item).toBeVisible();

    await app.screenshot('sidebar-chat-delete-before');

    // Register dialog handler BEFORE triggering delete
    page.once('dialog', d => d.accept());
    await sidebar.hoverChat(chatId);
    await sidebar.chatDeleteBtn(chatId).click();

    // Wait for item to disappear
    await expect(item).not.toBeVisible({ timeout: 5000 });

    await app.screenshot('sidebar-chat-delete-after');

    // The chat is deleted — clear id so afterEach doesn't try to delete again
    const deletedId = chatId;
    chatId = '';

    // Verify it's gone via API (expect 404) — must use authenticated request
    const res = await app.apiGet(`/api/chats/${deletedId}`);
    expect(res.status()).toBe(404);
  });
});
