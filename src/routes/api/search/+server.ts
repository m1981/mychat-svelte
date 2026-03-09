import { json, error } from '@sveltejs/kit';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { db } from '$lib/server/db';
import { messages, chats } from '$lib/server/db/schema';
import { sql, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { query, limit = 5 } = body;

	if (!query || typeof query !== 'string' || query.trim().length === 0) {
		throw error(400, 'query is required');
	}

	if (!env.OPENAI_API_KEY) {
		// Return empty results gracefully when embeddings aren't configured
		return json([]);
	}

	const openaiProvider = createOpenAI({ apiKey: env.OPENAI_API_KEY });

	const { embedding: queryEmbedding } = await embed({
		model: openaiProvider.embedding('text-embedding-3-small'),
		value: query.trim()
	});

	const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

	const results = await db
		.select({
			messageId: messages.id,
			chatId: messages.chatId,
			chatTitle: chats.title,
			content: messages.content,
			role: messages.role,
			score: sql<number>`1 - (${messages.embedding} <=> ${embeddingLiteral}::vector)`
		})
		.from(messages)
		.innerJoin(chats, eq(messages.chatId, chats.id))
		.where(sql`${messages.embedding} IS NOT NULL`)
		.orderBy(sql`${messages.embedding} <=> ${embeddingLiteral}::vector`)
		.limit(limit);

	return json(results);
};
