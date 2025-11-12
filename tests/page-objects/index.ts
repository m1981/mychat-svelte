import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Base Page Object - Common functionality across all pages
 */
export class BasePage {
	constructor(protected page: Page) {}

	async goto(path: string = '/') {
		await this.page.goto(path);
		await this.waitForPageLoad();
	}

	async waitForPageLoad() {
		await this.page.waitForLoadState('networkidle');
	}

	async screenshot(name: string) {
		await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
	}
}

/**
 * Sidebar Page Object - Folder and chat navigation
 */
export class SidebarPage extends BasePage {
	// Locators
	readonly newFolderButton: Locator;
	readonly newChatButton: Locator;
	readonly searchInput: Locator;
	readonly foldersList: Locator;
	readonly chatsList: Locator;

	constructor(page: Page) {
		super(page);
		this.newFolderButton = page.getByRole('button', { name: /new folder/i });
		this.newChatButton = page.getByRole('button', { name: /new chat|\+ new/i });
		this.searchInput = page.getByPlaceholder(/search/i);
		this.foldersList = page.locator('[data-testid="folders-list"]');
		this.chatsList = page.locator('[data-testid="chats-list"]');
	}

	// Actions
	async createFolder(name?: string) {
		await this.newFolderButton.click();
		if (name) {
			const folderInput = this.page.getByRole('textbox', { name: /folder name/i });
			await folderInput.fill(name);
			await folderInput.press('Enter');
		}
	}

	async createChat() {
		await this.newChatButton.click();
	}

	// --- Robust helper methods to get specific items ---
	getChatItem(chatTitle: string): Locator {
		return this.chatsList.locator('.chat-history-item', { hasText: chatTitle });
	}



	getFolderItem(folderName: string): Locator {
		return this.foldersList.locator('.chat-folder', {
			has: this.page.locator(`text="${folderName}"`)
		});
	}

	// --- Actions using the robust helper methods ---
	async renameChat(oldTitle: string, newTitle: string) {
		const chatItem = this.getChatItem(oldTitle);
		await chatItem.hover();
		await chatItem.getByRole('button', { name: /rename chat/i }).click();

		const input = chatItem.locator('input[type="text"]');
		await expect(input).toBeVisible();
		await input.fill(newTitle);
		await input.press('Enter');
	}

	async deleteChat(chatTitle: string) {
		const chatItem = this.getChatItem(chatTitle);
		await chatItem.hover();

		// Handle confirmation dialog automatically
		this.page.once('dialog', (dialog) => dialog.accept());

		await chatItem.getByRole('button', { name: /delete chat/i }).click();
	}

	async renameFolder(oldName: string, newName: string) {
		const folderItem = this.getFolderItem(oldName);
		await folderItem.hover();
		await folderItem.getByRole('button', { name: /edit folder|rename folder/i }).click();

		const input = folderItem.locator('input[type="text"]');
		await expect(input).toBeVisible();
		await input.fill(newName);
		await input.press('Enter');
	}

	async deleteFolder(folderName: string) {
		const folderItem = this.getFolderItem(folderName);
		await folderItem.hover();

		this.page.once('dialog', (dialog) => dialog.accept());

		await folderItem.getByRole('button', { name: /delete folder/i }).click();
	}

	async selectChat(chatTitle: string) {
		await this.getChatItem(chatTitle).click();
	}

	// Assertions
	async expectFolderExists(folderName: string, { isVisible = true } = {}) {
		const folderItem = this.getFolderItem(folderName);
		if (isVisible) {
			await expect(folderItem).toBeVisible();
		} else {
			await expect(folderItem).not.toBeVisible();
		}
	}

	async expectChatExists(chatTitle: string, { isVisible = true } = {}) {
		const chatItem = this.getChatItem(chatTitle);
		if (isVisible) {
			await expect(chatItem).toBeVisible();
		} else {
			await expect(chatItem).not.toBeVisible();
		}
	}
}

/**
 * Chat Page Object - Main chat interface
 */
export class ChatPage extends BasePage {
	// Locators
	readonly messageInput: Locator;
	readonly sendButton: Locator;
	readonly messagesList: Locator;
	readonly chatTitle: Locator;

	constructor(page: Page) {
		super(page);
		this.messageInput = page.getByPlaceholder(/type a message/i);
		this.sendButton = page.getByRole('button', { name: /send/i });
		this.messagesList = page.locator('[data-testid="messages-list"]');
		this.chatTitle = page.locator('[data-testid="chat-title"]');
	}

	// Actions
	async sendMessage(text: string) {
		await this.messageInput.fill(text);
		await this.sendButton.click();
	}

	async waitForAIResponseCompletion(timeout: number = 30000) {
		const loadingIndicator = this.page.locator('[data-testid="ai-loading"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
		await expect(loadingIndicator).not.toBeVisible({ timeout });
	}

	async getLastMessageText(): Promise<string> {
		const lastMessage = this.messagesList.locator('[data-testid="message"]').last();
		return (await lastMessage.textContent()) || '';
	}

	async highlightText(messageIndex: number, text: string) {
		const message = this.messagesList.locator('[data-testid="message"]').nth(messageIndex);
		await message.locator(`text=${text}`).highlight();
		await message.click({ button: 'right' });
		await this.page.getByRole('menuitem', { name: /highlight/i }).click();
	}

	async openMessageContextMenu(messageIndex: number) {
		const message = this.messagesList.locator('[data-testid="message"]').nth(messageIndex);
		await message.click({ button: 'right' });
	}
}

// FIX: Added the full class definitions for NotesPanelPage and HighlightsPanelPage

/**
 * Notes Panel Page Object
 */
export class NotesPanelPage extends BasePage {
	// Locators
	readonly notesTab: Locator;
	readonly addNoteButton: Locator;
	readonly notesList: Locator;
	readonly noteEditor: Locator;

	constructor(page: Page) {
		super(page);
		this.notesTab = page.getByRole('tab', { name: /notes/i });
		this.addNoteButton = page.getByRole('button', { name: /add note/i });
		this.notesList = page.locator('[data-testid="notes-list"]');
		this.noteEditor = page.locator('[data-testid="note-editor"]');
	}

	// Actions
	async openNotesPanel() {
		if (!(await this.notesTab.getAttribute('aria-selected'))) {
			await this.notesTab.click();
		}
	}

	async createNote(content: string, type: 'SCRATCH' | 'SUMMARY' | 'TODO' = 'SCRATCH') {
		await this.openNotesPanel();
		await this.addNoteButton.click();
		await this.page.getByRole('button', { name: type }).click();
		await this.noteEditor.fill(content);
		await this.page.getByRole('button', { name: /save/i }).click();
	}

	async editNote(noteIndex: number, newContent: string) {
		const note = this.notesList.locator('[data-testid="note-item"]').nth(noteIndex);
		await note.click();
		await this.noteEditor.fill(newContent);
		await this.page.getByRole('button', { name: /save/i }).click();
	}

	async deleteNote(noteIndex: number) {
		const note = this.notesList.locator('[data-testid="note-item"]').nth(noteIndex);
		await note.hover();
		await note.locator('[data-testid="delete-note"]').click();
		await this.page.getByRole('button', { name: /confirm|delete/i }).click();
	}

	// Assertions
	async expectNoteExists(content: string) {
		await expect(this.notesList.getByText(content)).toBeVisible();
	}

	async expectNoteCount(count: number) {
		await expect(this.notesList.locator('[data-testid="note-item"]')).toHaveCount(count);
	}
}

/**
 * Highlights Panel Page Object
 */
export class HighlightsPanelPage extends BasePage {
	// Locators
	readonly highlightsTab: Locator;
	readonly highlightsList: Locator;

	constructor(page: Page) {
		super(page);
		this.highlightsTab = page.getByRole('tab', { name: /highlights/i });
		this.highlightsList = page.locator('[data-testid="highlights-list"]');
	}

	// Actions
	async openHighlightsPanel() {
		if (!(await this.highlightsTab.getAttribute('aria-selected'))) {
			await this.highlightsTab.click();
		}
	}

	async clickHighlight(index: number) {
		const highlight = this.highlightsList.locator('[data-testid="highlight-item"]').nth(index);
		await highlight.click();
	}

	async deleteHighlight(index: number) {
		const highlight = this.highlightsList.locator('[data-testid="highlight-item"]').nth(index);
		await highlight.hover();
		await highlight.locator('[data-testid="delete-highlight"]').click();
	}

	async changeHighlightColor(index: number, color: string) {
		const highlight = this.highlightsList.locator('[data-testid="highlight-item"]').nth(index);
		await highlight.hover();
		await highlight.locator('[data-testid="color-picker"]').click();
		await this.page.getByRole('button', { name: color }).click();
	}

	// Assertions
	async expectHighlightExists(text: string) {
		await expect(this.highlightsList.getByText(text)).toBeVisible();
	}

	async expectHighlightCount(count: number) {
		await expect(this.highlightsList.locator('[data-testid="highlight-item"]')).toHaveCount(count);
	}
}