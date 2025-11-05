import { test, expect } from '../fixtures';

/**
 * E2E Tests: Notes Management
 *
 * Covers:
 * - Creating notes (chat-level and message-level)
 * - Editing notes
 * - Deleting notes
 * - Note types (SCRATCH, SUMMARY, TODO)
 * - Note navigation
 * - Note persistence
 */

test.describe('Notes Management', () => {
	test.beforeEach(async ({ page, testData }) => {
		// Navigate to a test chat
		await page.goto(`/chat/${testData.chats[0].id}`);
	});

	test.describe('Creating Notes', () => {
		test('should create a chat-level note', async ({ notesPanel, page }) => {
			// Arrange
			const noteContent = 'Important API endpoint discussion';

			// Act
			await notesPanel.createNote(noteContent, 'SCRATCH');

			// Assert
			await notesPanel.expectNoteExists(noteContent);
			await expect(page.getByText(noteContent)).toBeVisible();
		});

		test('should create a message-level note', async ({
			notesPanel,
			chatPage,
			page
		}) => {
			// Arrange - Send a message first
			await chatPage.sendMessage('What is the capital of France?');
			await chatPage.waitForAIResponse();

			// Act - Create note from message context menu
			await chatPage.openMessageContextMenu(1); // AI response
			await page.getByRole('menuitem', { name: /add note/i }).click();

			const noteContent = 'Good explanation about Paris';
			await notesPanel.noteEditor.fill(noteContent);
			await page.getByRole('button', { name: /save/i }).click();

			// Assert
			await notesPanel.expectNoteExists(noteContent);

			// Note should be linked to message
			const note = page.locator('[data-testid="note-item"]').filter({
				hasText: noteContent
			});
			await expect(note.locator('[data-testid="message-link"]')).toBeVisible();
		});

		test('should create notes of different types', async ({ notesPanel }) => {
			const noteTypes: Array<'SCRATCH' | 'SUMMARY' | 'TODO'> = [
				'SCRATCH',
				'SUMMARY',
				'TODO'
			];

			for (const type of noteTypes) {
				await test.step(`Create ${type} note`, async () => {
					const content = `Test ${type} note`;
					await notesPanel.createNote(content, type);
					await notesPanel.expectNoteExists(content);
				});
			}

			// Assert all notes created
			await notesPanel.expectNoteCount(3);
		});

		test('should auto-save notes while typing', async ({ notesPanel, page }) => {
			// Arrange
			await notesPanel.openNotesPanel();
			await notesPanel.addNoteButton.click();

			// Act - Type content with pauses
			const content = 'Auto-saved content';
			for (const char of content) {
				await notesPanel.noteEditor.pressSequentially(char, { delay: 100 });
			}

			// Wait for auto-save (typically 500ms debounce)
			await page.waitForTimeout(1000);

			// Assert - Reload and check persistence
			await page.reload();
			await notesPanel.openNotesPanel();
			await notesPanel.expectNoteExists(content);
		});
	});

	test.describe('Editing Notes', () => {
		test('should edit existing note', async ({ notesPanel }) => {
			// Arrange
			const initialContent = 'Initial note content';
			await notesPanel.createNote(initialContent);

			// Act
			const updatedContent = 'Updated note content';
			await notesPanel.editNote(0, updatedContent);

			// Assert
			await notesPanel.expectNoteExists(updatedContent);
			await expect(notesPanel.page.getByText(initialContent)).not.toBeVisible();
		});

		test('should preserve note metadata when editing', async ({ notesPanel, page }) => {
			// Arrange
			await notesPanel.createNote('Test note', 'TODO');

			// Get initial timestamp
			const note = page.locator('[data-testid="note-item"]').first();
			const initialTimestamp = await note.locator('[data-testid="note-timestamp"]')
				.textContent();

			// Act - Edit note
			await notesPanel.editNote(0, 'Updated test note');

			// Assert - Type should remain TODO
			await expect(note.locator('[data-testid="note-type"]')).toHaveText('TODO');

			// Timestamp should be updated
			const updatedTimestamp = await note.locator('[data-testid="note-timestamp"]')
				.textContent();
			expect(updatedTimestamp).not.toBe(initialTimestamp);
		});
	});

	test.describe('Deleting Notes', () => {
		test('should delete a note', async ({ notesPanel }) => {
			// Arrange
			const noteContent = 'Note to delete';
			await notesPanel.createNote(noteContent);
			await notesPanel.expectNoteCount(1);

			// Act
			await notesPanel.deleteNote(0);

			// Assert
			await notesPanel.expectNoteCount(0);
			await expect(notesPanel.page.getByText(noteContent)).not.toBeVisible();
		});

		test('should show confirmation dialog before deleting', async ({
			notesPanel,
			page
		}) => {
			// Arrange
			await notesPanel.createNote('Important note');

			// Act
			const note = notesPanel.notesList.locator('[data-testid="note-item"]').first();
			await note.hover();
			await note.locator('[data-testid="delete-note"]').click();

			// Assert
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByText(/are you sure/i)).toBeVisible();

			// Cancel deletion
			await page.getByRole('button', { name: /cancel/i }).click();
			await notesPanel.expectNoteCount(1);
		});
	});

	test.describe('Note Navigation', () => {
		test('should navigate to linked message when clicking note', async ({
			notesPanel,
			chatPage,
			page
		}) => {
			// Arrange - Create chat with multiple messages
			await chatPage.sendMessage('First message');
			await chatPage.waitForAIResponse();
			await chatPage.sendMessage('Second message');
			await chatPage.waitForAIResponse();

			// Create note linked to first AI response
			await chatPage.openMessageContextMenu(1);
			await page.getByRole('menuitem', { name: /add note/i }).click();
			await notesPanel.noteEditor.fill('Note on first response');
			await page.getByRole('button', { name: /save/i }).click();

			// Scroll down
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

			// Act - Click note to navigate
			await notesPanel.openNotesPanel();
			await notesPanel.clickHighlight(0);

			// Assert - Should scroll to message and highlight it
			const targetMessage = chatPage.messagesList
				.locator('[data-testid="message"]')
				.nth(1);
			await expect(targetMessage).toBeInViewport();
			await expect(targetMessage).toHaveClass(/highlighted/);
		});

		test('should filter notes by type', async ({ notesPanel, page }) => {
			// Arrange - Create notes of different types
			await notesPanel.createNote('Scratch note', 'SCRATCH');
			await notesPanel.createNote('Summary note', 'SUMMARY');
			await notesPanel.createNote('Todo note', 'TODO');

			// Act - Filter by TODO
			await page.getByRole('button', { name: /filter/i }).click();
			await page.getByRole('checkbox', { name: 'TODO' }).check();
			await page.getByRole('checkbox', { name: 'SCRATCH' }).uncheck();
			await page.getByRole('checkbox', { name: 'SUMMARY' }).uncheck();

			// Assert - Only TODO notes visible
			await notesPanel.expectNoteCount(1);
			await notesPanel.expectNoteExists('Todo note');
		});
	});

	test.describe('Note Organization', () => {
		test('should display notes in chronological order', async ({ notesPanel, page }) => {
			// Arrange
			const notes = ['First note', 'Second note', 'Third note'];

			for (const note of notes) {
				await notesPanel.createNote(note);
				await page.waitForTimeout(100); // Ensure different timestamps
			}

			// Assert - Check order
			const noteItems = notesPanel.notesList.locator('[data-testid="note-item"]');

			for (let i = 0; i < notes.length; i++) {
				const text = await noteItems.nth(i).textContent();
				expect(text).toContain(notes[notes.length - 1 - i]); // Reversed (newest first)
			}
		});

		test('should show empty state when no notes exist', async ({ notesPanel, page }) => {
			// Act
			await notesPanel.openNotesPanel();

			// Assert
			await expect(page.getByText(/no notes yet/i)).toBeVisible();
			await expect(notesPanel.addNoteButton).toBeVisible();
		});

		test('should display note count in panel tab', async ({ notesPanel, page }) => {
			// Arrange
			await notesPanel.createNote('Test note 1');
			await notesPanel.createNote('Test note 2');

			// Assert
			const badge = notesPanel.notesTab.locator('[data-testid="note-count"]');
			await expect(badge).toHaveText('2');
		});
	});

	test.describe('Note Tags', () => {
		test('should add tags to notes', async ({ notesPanel, page }) => {
			// Arrange
			await notesPanel.openNotesPanel();
			await notesPanel.addNoteButton.click();

			// Act
			await notesPanel.noteEditor.fill('Tagged note');
			await page.getByRole('button', { name: /add tag/i }).click();
			await page.getByPlaceholder(/tag name/i).fill('important');
			await page.keyboard.press('Enter');

			await page.getByRole('button', { name: /save/i }).click();

			// Assert
			const note = page.locator('[data-testid="note-item"]').first();
			await expect(note.locator('[data-testid="note-tag"]')).toHaveText('important');
		});

		test('should filter notes by tag', async ({ notesPanel, page }) => {
			// Arrange
			await notesPanel.createNote('Work note');
			// Add 'work' tag (implementation depends on UI)

			await notesPanel.createNote('Personal note');
			// Add 'personal' tag

			// Act
			await page.getByRole('button', { name: /tags/i }).click();
			await page.getByRole('checkbox', { name: 'work' }).check();

			// Assert
			await notesPanel.expectNoteCount(1);
			await notesPanel.expectNoteExists('Work note');
		});
	});

	test.describe('Note Persistence', () => {
		test('should persist notes after page reload', async ({ notesPanel, page }) => {
			// Arrange
			const noteContent = 'Persistent note';
			await notesPanel.createNote(noteContent);

			// Act
			await page.reload();

			// Assert
			await notesPanel.openNotesPanel();
			await notesPanel.expectNoteExists(noteContent);
		});

		test('should sync notes across multiple tabs', async ({
			notesPanel,
			page,
			context
		}) => {
			// Arrange
			const noteContent = 'Synced note';
			await notesPanel.createNote(noteContent);

			// Act - Open new tab with same chat
			const page2 = await context.newPage();
			await page2.goto(page.url());

			const notesPanel2 = new (notesPanel.constructor as any)(page2);
			await notesPanel2.openNotesPanel();

			// Assert
			await notesPanel2.expectNoteExists(noteContent);

			await page2.close();
		});
	});
});

/**
 * Visual Regression Tests for Notes
 */
test.describe('Notes Visual Tests', () => {
	test('should match notes panel snapshot', async ({ notesPanel, page, testData }) => {
		await page.goto(`/chat/${testData.chats[0].id}`);
		await notesPanel.openNotesPanel();
		await notesPanel.createNote('Sample note for visual test');

		await expect(notesPanel.notesList).toHaveScreenshot('notes-panel.png');
	});
});