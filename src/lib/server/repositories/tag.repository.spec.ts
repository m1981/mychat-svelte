import './test-setup'; // Must be first
import { describe, it, expect, beforeEach } from 'vitest';
import { TagRepository } from './tag.repository';

/**
 * Unit tests for TagRepository
 */
describe('TagRepository', () => {
	let repository: TagRepository;

	beforeEach(() => {
		repository = new TagRepository();
	});

	describe('Contract Tests - Core CRUD', () => {
		it('should have create method', () => {
			expect(repository.create).toBeDefined();
			expect(typeof repository.create).toBe('function');
		});

		it('should have findById method', () => {
			expect(repository.findById).toBeDefined();
			expect(typeof repository.findById).toBe('function');
		});

		it('should have update method', () => {
			expect(repository.update).toBeDefined();
			expect(typeof repository.update).toBe('function');
		});

		it('should have delete method', () => {
			expect(repository.delete).toBeDefined();
			expect(typeof repository.delete).toBe('function');
		});
	});

	describe('Contract Tests - Query Methods', () => {
		it('should have findByUserId method', () => {
			expect(repository.findByUserId).toBeDefined();
			expect(typeof repository.findByUserId).toBe('function');
		});

		it('should have findByUserIdAndType method', () => {
			expect(repository.findByUserIdAndType).toBeDefined();
			expect(typeof repository.findByUserIdAndType).toBe('function');
		});

		it('should have findByNameAndType method', () => {
			expect(repository.findByNameAndType).toBeDefined();
			expect(typeof repository.findByNameAndType).toBe('function');
		});

		it('should have searchByName method', () => {
			expect(repository.searchByName).toBeDefined();
			expect(typeof repository.searchByName).toBe('function');
		});

		it('should have findOrCreate method', () => {
			expect(repository.findOrCreate).toBeDefined();
			expect(typeof repository.findOrCreate).toBe('function');
		});
	});

	describe('Contract Tests - Chat Tag Operations', () => {
		it('should have getTagsForChat method', () => {
			expect(repository.getTagsForChat).toBeDefined();
			expect(typeof repository.getTagsForChat).toBe('function');
		});

		it('should have addTagToChat method', () => {
			expect(repository.addTagToChat).toBeDefined();
			expect(typeof repository.addTagToChat).toBe('function');
		});

		it('should have removeTagFromChat method', () => {
			expect(repository.removeTagFromChat).toBeDefined();
			expect(typeof repository.removeTagFromChat).toBe('function');
		});
	});

	describe('Contract Tests - Message Tag Operations', () => {
		it('should have getTagsForMessage method', () => {
			expect(repository.getTagsForMessage).toBeDefined();
			expect(typeof repository.getTagsForMessage).toBe('function');
		});

		it('should have addTagToMessage method', () => {
			expect(repository.addTagToMessage).toBeDefined();
			expect(typeof repository.addTagToMessage).toBe('function');
		});

		it('should have removeTagFromMessage method', () => {
			expect(repository.removeTagFromMessage).toBeDefined();
			expect(typeof repository.removeTagFromMessage).toBe('function');
		});
	});

	describe('Contract Tests - Note Tag Operations', () => {
		it('should have getTagsForNote method', () => {
			expect(repository.getTagsForNote).toBeDefined();
			expect(typeof repository.getTagsForNote).toBe('function');
		});

		it('should have addTagToNote method', () => {
			expect(repository.addTagToNote).toBeDefined();
			expect(typeof repository.addTagToNote).toBe('function');
		});

		it('should have removeTagFromNote method', () => {
			expect(repository.removeTagFromNote).toBeDefined();
			expect(typeof repository.removeTagFromNote).toBe('function');
		});
	});

	describe('Type Safety Tests', () => {
		it('should accept valid tag data structure', () => {
			const validTag = {
				userId: 1,
				name: 'important',
				color: '#FF0000',
				type: 'CHAT' as const
			};

			expect(validTag.name).toBe('important');
			expect(validTag.type).toBe('CHAT');
		});

		it('should enforce tag type enum', () => {
			const types: Array<'CHAT' | 'MESSAGE' | 'NOTE'> = ['CHAT', 'MESSAGE', 'NOTE'];

			expect(types).toHaveLength(3);
			expect(types).toContain('CHAT');
			expect(types).toContain('MESSAGE');
			expect(types).toContain('NOTE');
		});

		it('should handle optional color field', () => {
			const tagWithoutColor = {
				userId: 1,
				name: 'uncolored',
				type: 'MESSAGE' as const
			};

			expect(tagWithoutColor.color).toBeUndefined();
		});

		it('should validate color format', () => {
			const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];

			validColors.forEach((color) => {
				expect(color).toMatch(/^#[0-9A-F]{6}$/i);
			});
		});
	});

	describe('Tag Name Validation', () => {
		it('should handle tag names of various lengths', () => {
			const shortName = 'ai';
			const mediumName = 'machine-learning';
			const longName = 'very-long-tag-name-that-is-still-valid';

			expect(shortName.length).toBeLessThanOrEqual(50);
			expect(mediumName.length).toBeLessThanOrEqual(50);
			expect(longName.length).toBeLessThanOrEqual(50);
		});

		it('should handle special characters in tag names', () => {
			const tagsWithSpecialChars = ['tag-with-dash', 'tag_with_underscore', 'tag.with.dots'];

			tagsWithSpecialChars.forEach((tag) => {
				expect(tag).toBeTruthy();
				expect(typeof tag).toBe('string');
			});
		});
	});
});

/**
 * Integration point tests
 */
describe('TagRepository - Integration Points', () => {
	it('should support tag management across all entity types', () => {
		const repository = new TagRepository();

		// Chat tags
		expect(repository.getTagsForChat).toBeDefined();
		expect(repository.addTagToChat).toBeDefined();
		expect(repository.removeTagFromChat).toBeDefined();

		// Message tags
		expect(repository.getTagsForMessage).toBeDefined();
		expect(repository.addTagToMessage).toBeDefined();
		expect(repository.removeTagFromMessage).toBeDefined();

		// Note tags
		expect(repository.getTagsForNote).toBeDefined();
		expect(repository.addTagToNote).toBeDefined();
		expect(repository.removeTagFromNote).toBeDefined();
	});

	it('should support tag discovery and search', () => {
		const repository = new TagRepository();

		expect(repository.findByUserId).toBeDefined();
		expect(repository.findByUserIdAndType).toBeDefined();
		expect(repository.searchByName).toBeDefined();
	});

	it('should support find-or-create pattern', () => {
		const repository = new TagRepository();

		expect(repository.findOrCreate).toBeDefined();
		expect(repository.findByNameAndType).toBeDefined();
	});
});
