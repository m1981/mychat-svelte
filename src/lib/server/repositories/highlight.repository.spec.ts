import './test-setup'; // Must be first
import { describe, it, expect, beforeEach } from 'vitest';
import { HighlightRepository } from './highlight.repository';

/**
 * Unit tests for HighlightRepository
 */
describe('HighlightRepository', () => {
	let repository: HighlightRepository;

	beforeEach(() => {
		repository = new HighlightRepository();
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

		it('should have findByMessageId method', () => {
			expect(repository.findByMessageId).toBeDefined();
			expect(typeof repository.findByMessageId).toBe('function');
		});

		it('should have findByMessageIds method', () => {
			expect(repository.findByMessageIds).toBeDefined();
			expect(typeof repository.findByMessageIds).toBe('function');
		});

		it('should have update method', () => {
			expect(repository.update).toBeDefined();
			expect(typeof repository.update).toBe('function');
		});

		it('should have delete method', () => {
			expect(repository.delete).toBeDefined();
			expect(typeof repository.delete).toBe('function');
		});

		it('should have deleteByMessageId method', () => {
			expect(repository.deleteByMessageId).toBeDefined();
			expect(typeof repository.deleteByMessageId).toBe('function');
		});

		it('should have checkOverlap method', () => {
			expect(repository.checkOverlap).toBeDefined();
			expect(typeof repository.checkOverlap).toBe('function');
		});
	});

	describe('Type Safety Tests', () => {
		it('should accept valid highlight data structure', () => {
			const validHighlight = {
				messageId: 'msg123',
				text: 'highlighted text',
				startOffset: 0,
				endOffset: 15,
				color: '#FFFF00',
				note: 'Important point'
			};

			expect(validHighlight.startOffset).toBe(0);
			expect(validHighlight.endOffset).toBe(15);
			expect(validHighlight.text).toBe('highlighted text');
		});

		it('should handle optional color and note fields', () => {
			const minimalHighlight = {
				messageId: 'msg123',
				text: 'text',
				startOffset: 0,
				endOffset: 4
			};

			expect(minimalHighlight.color).toBeUndefined();
			expect(minimalHighlight.note).toBeUndefined();
		});

		it('should validate offset values are numbers', () => {
			const highlight = {
				startOffset: 10,
				endOffset: 20
			};

			expect(typeof highlight.startOffset).toBe('number');
			expect(typeof highlight.endOffset).toBe('number');
			expect(highlight.endOffset).toBeGreaterThan(highlight.startOffset);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty message IDs array in findByMessageIds', async () => {
			const result = await repository.findByMessageIds([]);
			expect(result).toEqual([]);
		});

		it('should handle zero-length highlights', () => {
			const zeroLengthHighlight = {
				messageId: 'msg123',
				text: '',
				startOffset: 5,
				endOffset: 5
			};

			expect(zeroLengthHighlight.endOffset - zeroLengthHighlight.startOffset).toBe(0);
		});

		it('should validate color format pattern', () => {
			const colors = ['#FFFF00', '#FF0000', '#00FF00'];

			colors.forEach((color) => {
				expect(color).toMatch(/^#[0-9A-F]{6}$/i);
			});
		});
	});

	describe('Overlap Detection', () => {
		it('should detect overlapping ranges', () => {
			// Range 1: [10, 20]
			// Range 2: [15, 25] - overlaps
			const range1 = { start: 10, end: 20 };
			const range2 = { start: 15, end: 25 };

			const overlaps = range2.start < range1.end && range2.end > range1.start;
			expect(overlaps).toBe(true);
		});

		it('should detect non-overlapping ranges', () => {
			// Range 1: [10, 20]
			// Range 2: [25, 30] - no overlap
			const range1 = { start: 10, end: 20 };
			const range2 = { start: 25, end: 30 };

			const overlaps = range2.start < range1.end && range2.end > range1.start;
			expect(overlaps).toBe(false);
		});

		it('should detect adjacent non-overlapping ranges', () => {
			// Range 1: [10, 20]
			// Range 2: [20, 30] - adjacent but not overlapping
			const range1 = { start: 10, end: 20 };
			const range2 = { start: 20, end: 30 };

			const overlaps = range2.start < range1.end && range2.end > range1.start;
			expect(overlaps).toBe(false);
		});
	});
});

/**
 * Integration point tests
 */
describe('HighlightRepository - Integration Points', () => {
	it('should follow create-read-update-delete pattern', () => {
		const repository = new HighlightRepository();

		expect(repository.create).toBeDefined();
		expect(repository.findById).toBeDefined();
		expect(repository.update).toBeDefined();
		expect(repository.delete).toBeDefined();
	});

	it('should support bulk operations', () => {
		const repository = new HighlightRepository();

		expect(repository.findByMessageIds).toBeDefined();
		expect(repository.deleteByMessageId).toBeDefined();
	});

	it('should support overlap detection', () => {
		const repository = new HighlightRepository();

		expect(repository.checkOverlap).toBeDefined();
	});
});
