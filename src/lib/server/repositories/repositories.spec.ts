import { describe, it, expect } from 'vitest';
import { generateId } from './base.repository';
import { chatRepository } from './chat.repository';
import { noteRepository } from './note.repository';
import { highlightRepository } from './highlight.repository';
import { attachmentRepository } from './attachment.repository';
import { tagRepository } from './tag.repository';

describe('Repository Layer Tests', () => {
	describe('Base Repository', () => {
		it('should generate unique IDs with prefix', () => {
			const id1 = generateId('test');
			const id2 = generateId('test');

			expect(id1).toContain('test-');
			expect(id2).toContain('test-');
			expect(id1).not.toBe(id2);
		});

		it('should generate IDs with different prefixes', () => {
			const chatId = generateId('chat');
			const noteId = generateId('note');

			expect(chatId).toContain('chat-');
			expect(noteId).toContain('note-');
		});
	});

	describe('Repository Exports', () => {
		it('should export ChatRepository instance', () => {
			expect(chatRepository).toBeDefined();
			expect(chatRepository.create).toBeDefined();
			expect(chatRepository.findById).toBeDefined();
			expect(chatRepository.update).toBeDefined();
			expect(chatRepository.delete).toBeDefined();
			expect(chatRepository.addMessage).toBeDefined();
		});

		it('should export NoteRepository instance', () => {
			expect(noteRepository).toBeDefined();
			expect(noteRepository.create).toBeDefined();
			expect(noteRepository.findById).toBeDefined();
			expect(noteRepository.findByChatId).toBeDefined();
			expect(noteRepository.update).toBeDefined();
			expect(noteRepository.delete).toBeDefined();
		});

		it('should export HighlightRepository instance', () => {
			expect(highlightRepository).toBeDefined();
			expect(highlightRepository.create).toBeDefined();
			expect(highlightRepository.findById).toBeDefined();
			expect(highlightRepository.findByMessageId).toBeDefined();
			expect(highlightRepository.update).toBeDefined();
			expect(highlightRepository.delete).toBeDefined();
		});

		it('should export AttachmentRepository instance', () => {
			expect(attachmentRepository).toBeDefined();
			expect(attachmentRepository.create).toBeDefined();
			expect(attachmentRepository.findById).toBeDefined();
			expect(attachmentRepository.findByChatId).toBeDefined();
			expect(attachmentRepository.delete).toBeDefined();
		});

		it('should export TagRepository instance', () => {
			expect(tagRepository).toBeDefined();
			expect(tagRepository.create).toBeDefined();
			expect(tagRepository.findById).toBeDefined();
			expect(tagRepository.findByUserId).toBeDefined();
			expect(tagRepository.delete).toBeDefined();
		});
	});

	describe('Type Validations', () => {
		it('should have correct return types for ChatRepository methods', () => {
			expect(typeof chatRepository.create).toBe('function');
			expect(typeof chatRepository.findById).toBe('function');
			expect(typeof chatRepository.findByUserId).toBe('function');
		});

		it('should have correct return types for NoteRepository methods', () => {
			expect(typeof noteRepository.create).toBe('function');
			expect(typeof noteRepository.findByChatId).toBe('function');
			expect(typeof noteRepository.findByMessageId).toBe('function');
		});
	});
});

// Note: Integration tests with actual database would be added here
// For now, we're validating structure and exports
describe('Repository Integration (Structure Validation)', () => {
	it('should validate repository method signatures', () => {
		// Validate ChatRepository
		expect(chatRepository.create).toHaveLength(1); // 1 parameter
		expect(chatRepository.findById).toHaveLength(2); // 2 parameters
		expect(chatRepository.update).toHaveLength(3); // 3 parameters
		expect(chatRepository.delete).toHaveLength(2); // 2 parameters

		// Validate NoteRepository
		expect(noteRepository.create).toHaveLength(1);
		expect(noteRepository.findById).toHaveLength(1);
		expect(noteRepository.update).toHaveLength(2);
		expect(noteRepository.delete).toHaveLength(1);

		// Validate HighlightRepository
		expect(highlightRepository.create).toHaveLength(1);
		expect(highlightRepository.findByMessageId).toHaveLength(1);
		expect(highlightRepository.update).toHaveLength(2);
		expect(highlightRepository.delete).toHaveLength(1);
	});
});
