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
	const workFolder = await request.post('/api/folders', {
		data: {
			name: 'Work',
			type: 'STANDARD',
			color: '#3b82f6'
		}
	});

	const personalFolder = await request.post('/api/folders', {
		data: {
			name: 'Personal',
			type: 'STANDARD',
			color: '#10b981'
		}
	});

	const folders = [
		await workFolder.json(),
		await personalFolder.json()
	];

	// Create chats
	const chat1 = await request.post('/api/chats', {
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

	const chats = [await chat1.json()];

	return { user, folders, chats };
}

/**
 * Helper to cleanup test data
 */
async function cleanupTestData(request: any, testData: TestData) {
	// Delete chats
	for (const chat of testData.chats) {
		try {
			await request.delete(`/api/chats/${chat.id}`);
		} catch (error) {
			console.warn(`Failed to delete chat ${chat.id}:`, error);
		}
	}

	// Delete folders
	for (const folder of testData.folders) {
		try {
			await request.delete(`/api/folders/${folder.id}?cascade=true`);
		} catch (error) {
			console.warn(`Failed to delete folder ${folder.id}:`, error);
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
	testData: async ({ request }, use) => {
		// Setup: Seed test data
		const testData = await seedTestData(request);

		// Use test data in test
		await use(testData);

		// Teardown: Cleanup test data
		await cleanupTestData(request, testData);
	}
});

export { expect };