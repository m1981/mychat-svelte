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

	async createChat(folderName?: string) {
		await this.newChatButton.click();

		if (folderName) {
			await this.selectFolder(folderName);
		}
	}

	async selectFolder(folderName: string) {
		await this.page.getByRole('button', { name: folderName }).click();
	}

	async selectChat(chatTitle: string) {
		await this.page.getByRole('link', { name: chatTitle }).click();
	}

	async renameFolder(oldName: string, newName: string) {
		const folder = this.page.getByRole('button', { name: oldName });
		await folder.dblclick();

		const input = this.page.locator('input[value="' + oldName + '"]');
		await input.fill(newName);
		await input.press('Enter');
	}

	async deleteFolder(folderName: string) {
		const folder = this.page.getByRole('button', { name: folderName });
		await folder.hover();
		await folder.locator('[data-testid="delete-folder"]').click();

		// Confirm deletion
		await this.page.getByRole('button', { name: /confirm|delete/i }).click();
	}

	async expandFolder(folderName: string) {
		const folder = this.page.getByRole('button', { name: folderName });
		const expanded = await folder.getAttribute('aria-expanded');

		if (expanded === 'false') {
			await folder.click();
		}
	}

	async collapseFolder(folderName: string) {
		const folder = this.page.getByRole('button', { name: folderName });
		const expanded = await folder.getAttribute('aria-expanded');

		if (expanded === 'true') {
			await folder.click();
		}
	}

	async getFolderChatCount(folderName: string): Promise<number> {
		await this.expandFolder(folderName);
		const folder = this.page.getByRole('button', { name: folderName });
		const badge = folder.locator('[data-testid="chat-count"]');
		const count = await badge.textContent();
		return parseInt(count || '0');
	}

	async searchChats(query: string) {
		await this.searchInput.fill(query);
		await this.page.waitForTimeout(300); // Debounce
	}

	// Assertions
	async expectFolderExists(folderName: string) {
		await expect(this.page.getByRole('button', { name: folderName })).toBeVisible();
	}

	async expectChatExists(chatTitle: string) {
		await expect(this.page.getByRole('link', { name: chatTitle })).toBeVisible();
	}

	async expectFolderCount(count: number) {
		await expect(this.foldersList.locator('[data-testid="folder-item"]')).toHaveCount(count);
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
		this.messageInput = page.getByPlaceholder(/type message|type a message/i);
		this.sendButton = page.getByRole('button', { name: /send/i });
		this.messagesList = page.locator('[data-testid="messages-list"]');
		this.chatTitle = page.locator('[data-testid="chat-title"]');
	}

	// Actions
	async sendMessage(text: string) {
		await this.messageInput.fill(text);
		await this.sendButton.click();

		// Wait for message to appear
		await this.page.waitForSelector(`text="${text}"`, { timeout: 5000 });
	}

	async waitForAIResponse(timeout: number = 30000) {
		// Wait for loading indicator to appear and disappear
		await this.page.waitForSelector('[data-testid="ai-loading"]', { timeout: 5000 });
		await this.page.waitForSelector('[data-testid="ai-loading"]', {
			state: 'hidden',
			timeout
		});
	}

	async getMessageCount(): Promise<number> {
		return await this.messagesList.locator('[data-testid="message"]').count();
	}

	async getLastMessage(): Promise<string> {
		const lastMessage = this.messagesList.locator('[data-testid="message"]').last();
		return (await lastMessage.textContent()) || '';
	}

	async highlightText(messageIndex: number, text: string) {
		const message = this.messagesList.locator('[data-testid="message"]').nth(messageIndex);

		// Select text (this is browser-specific, may need adjustment)
		await message.locator(`text="${text}"`).first().click();
		await this.page.keyboard.down('Shift');
		await this.page.keyboard.press('End');
		await this.page.keyboard.up('Shift');

		// Open context menu
		await this.page.keyboard.press('ContextMenu');

		// Click highlight option
		await this.page.getByRole('menuitem', { name: /highlight/i }).click();
	}

	async openMessageContextMenu(messageIndex: number) {
		const message = this.messagesList.locator('[data-testid="message"]').nth(messageIndex);
		await message.click({ button: 'right' });
	}

	async changeChatTitle(newTitle: string) {
		await this.chatTitle.dblclick();
		const input = this.page.locator('input[value]');
		await input.fill(newTitle);
		await input.press('Enter');
	}

	// Assertions
	async expectMessageVisible(text: string) {
		await expect(this.page.getByText(text)).toBeVisible();
	}

	async expectMessageCount(count: number) {
		await expect(this.messagesList.locator('[data-testid="message"]')).toHaveCount(count);
	}

	async expectAIResponseContains(text: string) {
		const lastMessage = this.messagesList.locator('[data-testid="message"]').last();
		await expect(lastMessage).toContainText(text);
	}
}

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

		// Select note type
		await this.page.getByRole('button', { name: type }).click();

		// Enter content
		await this.noteEditor.fill(content);

		// Save
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

		// Confirm
		await this.page.getByRole('button', { name: /confirm|delete/i }).click();
	}

	async getNoteCount(): Promise<number> {
		return await this.notesList.locator('[data-testid="note-item"]').count();
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

	async getHighlightCount(): Promise<number> {
		return await this.highlightsList.locator('[data-testid="highlight-item"]').count();
	}

	// Assertions
	async expectHighlightExists(text: string) {
		await expect(this.highlightsList.getByText(text)).toBeVisible();
	}

	async expectHighlightCount(count: number) {
		await expect(this.highlightsList.locator('[data-testid="highlight-item"]')).toHaveCount(count);
	}
}