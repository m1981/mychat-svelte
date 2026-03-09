import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SidebarPage {
  constructor(readonly page: Page) {}

  get newChatBtn() { return this.page.getByTestId('new-chat-btn').first(); }
  get newFolderBtn() { return this.page.getByTestId('new-folder-btn'); }

  chatItem(chatId: string) { return this.page.locator(`[data-testid="chat-item"][data-chat-id="${chatId}"]`); }
  chatTitle(chatId: string) { return this.chatItem(chatId).getByTestId('chat-title'); }
  chatRenameBtn(chatId: string) { return this.chatItem(chatId).getByTestId('chat-rename-btn'); }
  chatDeleteBtn(chatId: string) { return this.chatItem(chatId).getByTestId('chat-delete-btn'); }
  chatNameInput(chatId: string) { return this.chatItem(chatId).getByTestId('chat-name-input'); }

  folderItem(folderId: string) { return this.page.locator(`[data-testid="folder-item"][data-folder-id="${folderId}"]`); }
  folderName(folderId: string) { return this.folderItem(folderId).getByTestId('folder-name'); }
  folderRenameBtn(folderId: string) { return this.folderItem(folderId).getByTestId('folder-rename-btn'); }
  folderDeleteBtn(folderId: string) { return this.folderItem(folderId).getByTestId('folder-delete-btn'); }
  folderNameInput(folderId: string) { return this.folderItem(folderId).getByTestId('folder-name-input'); }

  async hoverChat(chatId: string) {
    await this.chatItem(chatId).hover();
  }

  async renameChat(chatId: string, newTitle: string) {
    await this.hoverChat(chatId);
    await this.chatRenameBtn(chatId).click();
    const input = this.chatNameInput(chatId);
    await expect(input).toBeVisible();
    await input.fill(newTitle);
    await input.press('Enter');
  }

  async deleteChat(chatId: string) {
    await this.hoverChat(chatId);
    await this.chatDeleteBtn(chatId).click();
    // Handle confirm dialog
    this.page.once('dialog', d => d.accept());
  }

  async hoverFolder(folderId: string) {
    await this.folderItem(folderId).hover();
  }

  async renameFolder(folderId: string, newName: string) {
    await this.hoverFolder(folderId);
    await this.folderRenameBtn(folderId).click();
    const input = this.folderNameInput(folderId);
    await expect(input).toBeVisible();
    await input.fill(newName);
    await input.press('Enter');
  }

  async deleteFolder(folderId: string) {
    this.page.once('dialog', d => d.accept());
    await this.hoverFolder(folderId);
    await this.folderDeleteBtn(folderId).click();
  }
}
