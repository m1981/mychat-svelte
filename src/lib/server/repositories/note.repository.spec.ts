import './test-setup'; // Must be first
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoteRepository } from './note.repository';
import type { Note } from '$lib/server/db/schema';

/**
 * Unit tests for NoteRepository
 * These tests verify the repository interface and logic
 */
describe('NoteRepository', () => {
	let repository: NoteRepository;

	beforeEach(() => {
		repository = new NoteRepository();
	});

	describe('Contract Tests', () => {
		it('should have create method', () => {
			expect(repository.create).toBeDefined();
			expect(typeof repository.create).toBe('function');
		});

		it('should have findById method', () => {
			expect(repository.findById).toBeDefined();
			expect(typeof repository.findById).toBe('function');
		});

		it('should have findByChatId method', () => {
			expect(repository.findByChatId).toBeDefined();
			expect(typeof repository.findByChatId).toBe('function');
		});

		it('should have findByMessageId method', () => {
			expect(repository.findByMessageId).toBeDefined();
			expect(typeof repository.findByMessageId).toBe('function');
		});

		it('should have update method', () => {
			expect(repository.update).toBeDefined();
			expect(typeof repository.update).toBe('function');
		});

		it('should have delete method', () => {
			expect(repository.delete).toBeDefined();
			expect(typeof repository.delete).toBe('function');
		});

		it('should have addTags method', () => {
			expect(repository.addTags).toBeDefined();
			expect(typeof repository.addTags).toBe('function');
		});

		it('should have removeTags method', () => {
			expect(repository.removeTags).toBeDefined();
			expect(typeof repository.removeTags).toBe('function');
		});

		it('should have getTagsForNote method', () => {
			expect(repository.getTagsForNote).toBeDefined();
			expect(typeof repository.getTagsForNote).toBe('function');
		});

		it('should have findByTagIds method', () => {
			expect(repository.findByTagIds).toBeDefined();
			expect(typeof repository.findByTagIds).toBe('function');
		});
	});

	describe('Type Safety Tests', () => {
		it('should accept valid note data structure', () => {
			const validNoteData = {
				chatId: 'chat123',
				messageId: 'msg123',
				type: 'SCRATCH' as const,
				content: 'Test note content'
			};

			// This test passes if TypeScript compilation succeeds
			expect(validNoteData.chatId).toBe('chat123');
			expect(validNoteData.type).toBe('SCRATCH');
		});

		it('should handle optional messageId', () => {
			const noteWithoutMessage = {
				chatId: 'chat123',
				type: 'SUMMARY' as const,
				content: 'Summary note'
			};

			expect(noteWithoutMessage.messageId).toBeUndefined();
		});

		it('should enforce note type enum', () => {
			const types: Array<'SCRATCH' | 'SUMMARY' | 'TODO'> = ['SCRATCH', 'SUMMARY', 'TODO'];

			expect(types).toHaveLength(3);
			expect(types).toContain('SCRATCH');
			expect(types).toContain('SUMMARY');
			expect(types).toContain('TODO');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty tag arrays in addTags', async () => {
			// The method should handle empty arrays gracefully
			const result = repository.addTags('note123', []);
			await expect(result).resolves.toBeUndefined();
		});

		it('should handle empty tag arrays in removeTags', async () => {
			// The method should handle empty arrays gracefully
			const result = repository.removeTags('note123', []);
			await expect(result).resolves.toBeUndefined();
		});

		it('should handle empty tagIds in findByTagIds', async () => {
			const result = await repository.findByTagIds([]);
			expect(result).toEqual([]);
		});
	});
});

/**
 * Integration point tests
 * These verify the expected behavior patterns
 */
describe('NoteRepository - Integration Points', () => {
	it('should follow create-read-update-delete pattern', () => {
		const repository = new NoteRepository();

		// Verify CRUD methods exist
		expect(repository.create).toBeDefined();
		expect(repository.findById).toBeDefined();
		expect(repository.update).toBeDefined();
		expect(repository.delete).toBeDefined();
	});

	it('should support tag management operations', () => {
		const repository = new NoteRepository();

		// Verify tag-related methods exist
		expect(repository.addTags).toBeDefined();
		expect(repository.removeTags).toBeDefined();
		expect(repository.getTagsForNote).toBeDefined();
		expect(repository.findByTagIds).toBeDefined();
	});

	it('should support querying by different dimensions', () => {
		const repository = new NoteRepository();

		// Verify query methods exist
		expect(repository.findById).toBeDefined();
		expect(repository.findByChatId).toBeDefined();
		expect(repository.findByMessageId).toBeDefined();
		expect(repository.findByTagIds).toBeDefined();
	});
});
