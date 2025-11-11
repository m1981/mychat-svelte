import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { notes } from './note.store';
import { highlights } from './highlight.store';
import { attachments } from './attachment.store';
import { search } from './search.store';

// Mock browser environment and services
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/services/local-db', () => ({
	localDB: {
		init: vi.fn().mockResolvedValue(undefined),
		saveNote: vi.fn().mockResolvedValue(undefined),
		deleteNote: vi.fn().mockResolvedValue(undefined),
		getNote: vi.fn().mockResolvedValue(null),
		getNotesByChatId: vi.fn().mockResolvedValue([]),
		// Add mocks for other stores as needed
		saveHighlight: vi.fn().mockResolvedValue(undefined),
		deleteHighlight: vi.fn().mockResolvedValue(undefined),
		getHighlightsByMessageId: vi.fn().mockResolvedValue([]),
		saveAttachment: vi.fn().mockResolvedValue(undefined),
		deleteAttachment: vi.fn().mockResolvedValue(undefined),
		getAttachmentsByChatId: vi.fn().mockResolvedValue([])
	}
}));
vi.mock('$lib/services/sync.service', () => ({
	syncService: {
		queueOperation: vi.fn().mockResolvedValue(undefined)
	}
}));

// Mock fetch for search store tests
global.fetch = vi.fn();

describe('Note Store', () => {
	beforeEach(() => {
		notes.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		expect(get(notes)).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(notes.loadByChatId).toBeDefined();
		expect(notes.create).toBeDefined();
		expect(notes.update).toBeDefined();
		expect(notes.delete).toBeDefined();
		expect(notes.clear).toBeDefined();
	});
});

describe('Highlight Store', () => {
	beforeEach(() => {
		highlights.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		expect(get(highlights)).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(highlights.loadByMessageId).toBeDefined();
		expect(highlights.create).toBeDefined();
		expect(highlights.update).toBeDefined();
		expect(highlights.delete).toBeDefined();
		expect(highlights.clear).toBeDefined();
	});
});

describe('Attachment Store', () => {
	beforeEach(() => {
		attachments.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		expect(get(attachments)).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(attachments.loadByChatId).toBeDefined();
		expect(attachments.create).toBeDefined();
		expect(attachments.delete).toBeDefined();
		expect(attachments.clear).toBeDefined();
	});
});

describe('Search Store', () => {
	beforeEach(() => {
		search.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty state', () => {
		const value = get(search);
		expect(value.results).toEqual([]);
		expect(value.isSearching).toBe(false);
	});
});

describe('Store Integration and Signatures', () => {
	it('should validate all stores are exported', () => {
		expect(notes).toBeDefined();
		expect(highlights).toBeDefined();
		expect(attachments).toBeDefined();
		expect(search).toBeDefined();
	});

	it('should validate store method signatures', () => {
		// Note store
		expect(notes.create).toHaveLength(1);
		expect(notes.update).toHaveLength(2);
		expect(notes.delete).toHaveLength(1);

		// Highlight store
		expect(highlights.create).toHaveLength(1);
		expect(highlights.update).toHaveLength(2);
		expect(highlights.delete).toHaveLength(1);

		// Attachment store
		expect(attachments.create).toHaveLength(1);
		expect(attachments.delete).toHaveLength(1);

		// Search store
		expect(search.search).toHaveLength(1);
	});
});
