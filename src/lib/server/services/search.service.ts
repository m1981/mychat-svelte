// src/lib/server/services/search.service.ts

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
	 *
	 * TODO: Implement semantic search with OpenAI embeddings
	 *
	 * Implementation Guide:
	 * 1. Install OpenAI SDK: npm install openai
	 * 2. Enable pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
	 * 3. Generate query embedding using OpenAI text-embedding-3-small
	 * 4. Use pgvector cosine similarity: 1 - (embedding <=> query_embedding)
	 * 5. Filter by minimum similarity threshold (e.g., 0.7)
	 * 6. Return top 20 results
	 *
	 * Example Implementation:
	 *
	 * ```typescript
	 * import OpenAI from 'openai';
	 * import { env } from '$env/dynamic/private';
	 *
	 * const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	 * const embeddingResponse = await openai.embeddings.create({
	 *   model: 'text-embedding-3-small',
	 *   input: query,
	 *   encoding_format: 'float'
	 * });
	 *
	 * const queryEmbedding = embeddingResponse.data[0].embedding;
	 *
	 * const results = await db.execute(sql`
	 *   SELECT
	 *     m.id as message_id,
	 *     m.content as message_content,
	 *     m.role as message_role,
	 *     m.chat_id,
	 *     c.title as chat_title,
	 *     c.created_at,
	 *     1 - (m.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
	 *   FROM messages m
	 *   JOIN chats c ON c.id = m.chat_id
	 *   WHERE
	 *     c.user_id = ${userId}
	 *     AND m.embedding IS NOT NULL
	 *   ORDER BY m.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
	 *   LIMIT 20
	 * `);
	 *
	 * return results.rows
	 *   .filter(row => row.similarity > 0.7)
	 *   .map(row => ({
	 *     type: 'message' as const,
	 *     id: row.message_id.toString(),
	 *     chatId: row.chat_id,
	 *     chatTitle: row.chat_title,
	 *     content: row.message_content,
	 *     snippet: this.createSnippet(row.message_content, query),
	 *     score: row.similarity,
	 *     highlights: [],
	 *     metadata: {
	 *       createdAt: row.created_at,
	 *       messageRole: row.message_role
	 *     }
	 *   }));
	 * ```
	 *
	 * Note: Requires embeddings to be generated for existing messages.
	 * Create a background job to process existing content.
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
				// Weighted average: text 30%, semantic 70%
				existing.score = (existing.score * 0.3) + (r.score * 0.7);
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