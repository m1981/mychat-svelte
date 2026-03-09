import { streamText, generateText, embed, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { messages, chats } from '$lib/server/db/schema';
import { eq, count, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });

export const POST: RequestHandler = async ({ request, params }) => {
	const { messages: uiMessages } = await request.json();
	const chatId = params.id;

	// 1. Save the user's incoming message to the database
	const lastMessage = uiMessages[uiMessages.length - 1];

	// In v5, content is stored in a `parts` array
	const userText = lastMessage.parts?.find((p: any) => p.type === 'text')?.text || '';

	await db.insert(messages).values({
		chatId,
		role: 'user',
		content: userText
	});

	// 2. Stream the response using Vercel AI SDK v5
	const result = streamText({
		model: anthropic('claude-sonnet-4-6'),
		// Convert v5 UIMessages to ModelMessages
		messages: await convertToModelMessages(uiMessages),
		async onFinish({ text }) {
			// 3. Automatically save the AI's response when the stream finishes
			const [assistantMsg] = await db
				.insert(messages)
				.values({ chatId, role: 'assistant', content: text })
				.returning({ id: messages.id });

			// 3b. Generate and save embedding asynchronously (non-blocking)
			if (env.OPENAI_API_KEY && assistantMsg) {
				const openaiProvider = createOpenAI({ apiKey: env.OPENAI_API_KEY });
				embed({
					model: openaiProvider.embedding('text-embedding-3-small'),
					value: text
				})
					.then(({ embedding }) =>
						db.update(messages).set({ embedding }).where(eq(messages.id, assistantMsg.id))
					)
					.catch((e) => console.error('Embedding generation failed:', e));
			}

			// 4. Auto-title: if this is the first assistant message, generate a short title
			const [{ value: assistantCount }] = await db
				.select({ value: count() })
				.from(messages)
				.where(and(eq(messages.chatId, chatId), eq(messages.role, 'assistant')));

			if (Number(assistantCount) === 1) {
				try {
					const { text: title } = await generateText({
						model: anthropic('claude-haiku-4-5-20251001'),
						prompt: `Generate a concise chat title (3-5 words, no quotes) for this conversation starter: "${userText}"`
					});
					await db
						.update(chats)
						.set({ title: title.trim().slice(0, 100), updatedAt: new Date() })
						.where(eq(chats.id, chatId));
				} catch (e) {
					console.error('Auto-title generation failed:', e);
				}
			}
		}
	});

	// Use the new v5 UI Message Stream Response
	return result.toUIMessageStreamResponse();
};