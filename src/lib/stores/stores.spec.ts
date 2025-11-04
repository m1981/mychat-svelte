import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { notes } from './note.store';
import { highlights } from './highlight.store';
import { attachments } from './attachment.store';
import { search } from './search.store';

// Mock fetch for tests
global.fetch = vi.fn();

describe('Note Store', () => {
	beforeEach(() => {
		notes.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		const value = get(notes);
		expect(value).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(notes.loadByChatId).toBeDefined();
		expect(notes.loadByMessageId).toBeDefined();
		expect(notes.create).toBeDefined();
		expect(notes.update).toBeDefined();
		expect(notes.delete).toBeDefined();
		expect(notes.clear).toBeDefined();
	});

	it('should clear notes', () => {
		notes.clear();
		const value = get(notes);
		expect(value).toEqual([]);
	});
});

describe('Highlight Store', () => {
	beforeEach(() => {
		highlights.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		const value = get(highlights);
		expect(value).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(highlights.loadByMessageId).toBeDefined();
		expect(highlights.create).toBeDefined();
		expect(highlights.update).toBeDefined();
		expect(highlights.delete).toBeDefined();
		expect(highlights.clear).toBeDefined();
	});

	it('should clear highlights', () => {
		highlights.clear();
		const value = get(highlights);
		expect(value).toEqual([]);
	});
});

describe('Attachment Store', () => {
	beforeEach(() => {
		attachments.clear();
		vi.clearAllMocks();
	});

	it('should initialize with empty array', () => {
		const value = get(attachments);
		expect(value).toEqual([]);
	});

	it('should have all required methods', () => {
		expect(attachments.loadByChatId).toBeDefined();
		expect(attachments.create).toBeDefined();
		expect(attachments.delete).toBeDefined();
		expect(attachments.clear).toBeDefined();
	});

	it('should clear attachments', () => {
		attachments.clear();
		const value = get(attachments);
		expect(value).toEqual([]);
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
		expect(value.query).toBe('');
		expect(value.took).toBe(0);
		expect(value.total).toBe(0);
	});

	it('should have all required methods', () => {
		expect(search.search).toBeDefined();
		expect(search.clear).toBeDefined();
	});

	it('should clear search state', () => {
		search.clear();
		const value = get(search);
		expect(value.results).toEqual([]);
		expect(value.isSearching).toBe(false);
	});
});

describe('Store Integration', () => {
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
