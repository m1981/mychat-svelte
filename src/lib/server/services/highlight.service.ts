import { highlightRepository } from '$lib/server/repositories/highlight.repository';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';

export class HighlightService {
	/**
	 * Create a new highlight
	 */
	async createHighlight(data: CreateHighlightDTO): Promise<Highlight> {
		return highlightRepository.create(data);
	}

	/**
	 * Get a highlight by ID
	 */
	async getHighlight(highlightId: string): Promise<Highlight> {
		const highlight = await highlightRepository.findById(highlightId);
		if (!highlight) {
			throw new Error('Highlight not found');
		}
		return highlight;
	}

	/**
	 * Get all highlights for a message
	 */
	async getMessageHighlights(messageId: string): Promise<Highlight[]> {
		return highlightRepository.findByMessageId(messageId);
	}

	/**
	 * Update a highlight
	 */
	async updateHighlight(highlightId: string, data: UpdateHighlightDTO): Promise<Highlight> {
		return highlightRepository.update(highlightId, data);
	}

	/**
	 * Delete a highlight
	 */
	async deleteHighlight(highlightId: string): Promise<void> {
		return highlightRepository.delete(highlightId);
	}
}

// Export singleton instance
export const highlightService = new HighlightService();
