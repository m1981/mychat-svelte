import { test as base, expect } from '@playwright/test';
import {
	SidebarPage,
	ChatPage,
	NotesPanelPage,
	HighlightsPanelPage
} from './page-objects';
import type { Chat, Folder } from '../src/lib/types/chat';

/**
 * Extended test fixtures with page objects and test data
 */
type TestFixtures = {
	sidebarPage: SidebarPage;
	chatPage: ChatPage;
	notesPanel: NotesPanelPage;
	highlightsPanel: HighlightsPanelPage;
	testData: TestData;
};

type TestData = {
	user: { id: number; email: string };
	folders: Folder[];
	chats: Chat[];
};

/**
 * Helper to seed test data via API
 */
async function seedTestData(request: any): Promise<TestData> {
	// Create test user
	const user = { id: 1, email: 'test@example.com' };

	// Create folders
	const workFolderResponse = await request.post('/api/folders', {
		data: {
			name: 'Work',
			type: 'STANDARD',
			color: '#3b82f6'
		}
	});
	expect(workFolderResponse.ok()).toBeTruthy();

	const personalFolderResponse = await request.post('/api/folders', {
		data: {
			name: 'Personal',
			type: 'STANDARD',
			color: '#10b981'
		}
	});
	expect(personalFolderResponse.ok()).toBeTruthy();

	const folders = [
		await workFolderResponse.json(),
		await personalFolderResponse.json()
	];

	// Create chats
	const chat1Response = await request.post('/api/chats', {
		data: {
			title: 'Test Chat 1',
			folderId: folders[0].id,
			config: {
				provider: 'anthropic',
				modelConfig: {
					model: 'claude-3-7-sonnet-20250219',
					max_tokens: 4096,
					temperature: 0.7,
					top_p: 1,
					presence_penalty: 0,
					frequency_penalty: 0
				}
			}
		}
	});
	expect(chat1Response.ok()).toBeTruthy();

	const chats = [await chat1Response.json()];

	return { user, folders, chats };
}

/**
 * Helper to cleanup test data
 */
async function cleanupTestData(request: any, testData: TestData) {
	// Delete chats
	for (const chat of testData.chats) {
		const response = await request.delete(`/api/chats/${chat.id}`);
		// REFACTOR: Check if the response was not ok AND not a 404 (already deleted).
		// This provides better feedback during cleanup without failing the whole suite.
		if (!response.ok() && response.status() !== 404) {
			console.warn(`Failed to delete chat ${chat.id}: Status ${response.status()}`);
		}
	}

	// Delete folders
	for (const folder of testData.folders) {
		const response = await request.delete(`/api/folders/${folder.id}?cascade=true`);
		if (!response.ok() && response.status() !== 404) {
			console.warn(`Failed to delete folder ${folder.id}: Status ${response.status()}`);
		}
	}
}

/**
 * Extended test with fixtures
 */
export const test = base.extend<TestFixtures>({
	// Page Object fixtures
	sidebarPage: async ({ page }, use) => {
		const sidebarPage = new SidebarPage(page);
		await use(sidebarPage);
	},

	chatPage: async ({ page }, use) => {
		const chatPage = new ChatPage(page);
		await use(chatPage);
	},

	notesPanel: async ({ page }, use) => {
		const notesPanel = new NotesPanelPage(page);
		await use(notesPanel);
	},

	highlightsPanel: async ({ page }, use) => {
		const highlightsPanel = new HighlightsPanelPage(page);
		await use(highlightsPanel);
	},

	// Test data fixture with setup/teardown
	testData: [
		async ({ request }, use) => {
		// Setup: Seed test data
			const data = await seedTestData(request);

		// Use test data in test
			await use(data);

		// Teardown: Cleanup test data
			await cleanupTestData(request, data);
		},
		{ auto: true } // REFACTOR: Set auto: true to automatically apply this fixture to every test.
		// This is useful for fixtures that set up a baseline state.
		// You can remove it if you only want to seed data for specific test files.
	]
});

export { expect };