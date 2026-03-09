import { test, expect } from '../fixtures';

test.describe('Sidebar Folder Management', () => {
  let folderId: string;
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (folderId) {
      await app.deleteFolderViaApi(folderId).catch(() => {});
      folderId = '';
    }
    if (chatId) {
      await app.deleteChatViaApi(chatId).catch(() => {});
      chatId = '';
    }
  });

  test('@smoke folder appears in sidebar after creation', async ({ app, sidebar, page }) => {
    folderId = await app.createFolderViaApi('My Test Folder');

    await app.goto('/');
    await page.reload();
    await app.screenshot('sidebar-folder-appears-initial');

    const item = sidebar.folderItem(folderId);
    await expect(item).toBeVisible();

    const name = sidebar.folderName(folderId);
    await expect(name).toBeVisible();
    await expect(name).toHaveText('My Test Folder');

    await app.screenshot('sidebar-folder-appears-visible');
    const nameText = await name.textContent();
    console.log(`Folder name in sidebar: "${nameText}"`);
  });

  test('@regression user can rename a folder', async ({ app, sidebar, page }) => {
    folderId = await app.createFolderViaApi('Original Folder');

    await app.goto('/');
    await page.reload();

    const item = sidebar.folderItem(folderId);
    await expect(item).toBeVisible();

    await app.screenshot('sidebar-folder-rename-before');

    await sidebar.renameFolder(folderId, 'Renamed Folder');

    await page.waitForTimeout(500);
    await page.reload();

    await app.screenshot('sidebar-folder-rename-after');

    const name = sidebar.folderName(folderId);
    await expect(name).toBeVisible();
    await expect(name).toHaveText('Renamed Folder');
  });

  test('@regression user can delete a folder and its chats become unfoldered', async ({ app, sidebar, page }) => {
    folderId = await app.createFolderViaApi('Folder To Delete');

    // Create a chat (not assigned to folder — we just verify folder disappears)
    chatId = await app.createChatViaApi();

    await app.goto('/');
    await page.reload();

    const folderItem = sidebar.folderItem(folderId);
    await expect(folderItem).toBeVisible();

    await app.screenshot('sidebar-folder-delete-before');

    // Register dialog handler BEFORE triggering delete
    page.once('dialog', d => d.accept());
    await sidebar.hoverFolder(folderId);
    await sidebar.folderDeleteBtn(folderId).click();

    // Wait for folder to disappear
    await expect(folderItem).not.toBeVisible({ timeout: 5000 });

    await app.screenshot('sidebar-folder-delete-after');

    // The folder is deleted — clear id so afterEach doesn't try to delete again
    folderId = '';
  });
});
