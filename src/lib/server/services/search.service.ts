import { db } from '$lib/server/db';
import { chats, messages, notes } from '$lib/server/db/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import type { SearchQuery, SearchResult, SearchResponse } from '$lib/types/search';

export class SearchService {
	/**
	 * Multi-modal search
	 */
	async search(query: SearchQuery, userId: number): Promise<SearchResponse> {
		const startTime = Date.now();
		let results: SearchResult[] = [];

		if (query.mode === 'text' && query.query) {
			results = await this.textSearch(query.query, userId, query.filters);
		} else if (query.mode === 'semantic' && query.query) {
			results = await this.semanticSearch(query.query, userId, query.filters);
		} else if (query.mode === 'hybrid' && query.query) {
			const textResults = await this.textSearch(query.query, userId, query.filters);
			const semanticResults = await this.semanticSearch(query.query, userId, query.filters);
			results = this.mergeResults(textResults, semanticResults);
		}

		// Apply pagination
		const page = query.pagination?.page || 0;
		const limit = query.pagination?.limit || 20;
		const paginatedResults = results.slice(page * limit, (page + 1) * limit);

		return {
			results: paginatedResults,
			pagination: {
				page,
				limit,
				total: results.length,
				hasMore: (page + 1) * limit < results.length
			},
			took: Date.now() - startTime
		};
	}

	/**
	 * Full-text search
	 */
	private async textSearch(
		query: string,
		userId: number,
		filters?: any
	): Promise<SearchResult[]> {
		const searchTerm = `%${query}%`;

		const results = await db
			.select({
				chatId: chats.id,
				chatTitle: chats.title,
				messageId: messages.id,
				messageContent: messages.content,
				messageRole: messages.role,
				createdAt: messages.createdAt
			})
			.from(chats)
			.leftJoin(messages, eq(messages.chatId, chats.id))
			.where(
				and(
					eq(chats.userId, userId),
					or(like(chats.title, searchTerm), like(messages.content, searchTerm))
				)
			)
			.limit(50);

		return results
			.filter((r) => r.messageId !== null)
			.map((r) => ({
				type: 'message' as const,
				id: r.messageId!.toString(),
				chatId: r.chatId,
				chatTitle: r.chatTitle,
				snippet: this.createSnippet(r.messageContent || '', query),
				content: r.messageContent || '',
				score: this.calculateTextScore(r.messageContent || '', query),
				highlights: this.extractHighlights(r.messageContent || '', query),
				metadata: {
					createdAt: r.createdAt || new Date(),
					messageRole: r.messageRole as 'user' | 'assistant'
				}
			}));
	}

	/**
	 * Semantic search using embeddings
	 * Note: Requires pgvector extension and embeddings to be generated
	 */
	private async semanticSearch(
		query: string,
		userId: number,
		filters?: any
	): Promise<SearchResult[]> {
		// TODO: Generate embedding for query using OpenAI
		// TODO: Use pgvector to find similar messages
		// For now, return empty array
		console.log('Semantic search not yet implemented');
		return [];
	}

	/**
	 * Merge and deduplicate results from multiple search modes
	 */
	private mergeResults(
		textResults: SearchResult[],
		semanticResults: SearchResult[]
	): SearchResult[] {
		const merged = new Map<string, SearchResult>();

		// Add text results
		textResults.forEach((r) => {
			const key = `${r.type}-${r.id}`;
			merged.set(key, r);
		});

		// Add semantic results (combine scores if duplicate)
		semanticResults.forEach((r) => {
			const key = `${r.type}-${r.id}`;
			const existing = merged.get(key);

			if (existing) {
				existing.score = (existing.score + r.score) / 2;
			} else {
				merged.set(key, r);
			}
		});

		return Array.from(merged.values()).sort((a, b) => b.score - a.score);
	}

	/**
	 * Create snippet with context around match
	 */
	private createSnippet(content: string, query: string, contextLength = 100): string {
		const index = content.toLowerCase().indexOf(query.toLowerCase());
		if (index === -1) return content.substring(0, contextLength) + '...';

		const start = Math.max(0, index - contextLength / 2);
		const end = Math.min(content.length, index + query.length + contextLength / 2);

		return (
			(start > 0 ? '...' : '') +
			content.substring(start, end) +
			(end < content.length ? '...' : '')
		);
	}

	/**
	 * Calculate relevance score for text search
	 */
	private calculateTextScore(content: string, query: string): number {
		const matches =
			(content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
		return Math.min(matches / 10, 1.0);
	}

	/**
	 * Extract highlight snippets around matches
	 */
	private extractHighlights(content: string, query: string): string[] {
		const regex = new RegExp(`(.{0,30}${query}.{0,30})`, 'gi');
		const matches = content.match(regex) || [];
		return matches.slice(0, 3);
	}
}

// Export singleton instance
export const searchService = new SearchService();
