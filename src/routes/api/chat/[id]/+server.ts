import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

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
		model: openai('gpt-4o'),
		// Convert v5 UIMessages to ModelMessages
		messages: await convertToModelMessages(uiMessages),
		async onFinish({ text }) {
			// 3. Automatically save the AI's response when the stream finishes
			await db.insert(messages).values({
				chatId,
				role: 'assistant',
				content: text
			});

			// TODO: Generate and save pgvector embedding here synchronously
		}
	});

	// Use the new v5 UI Message Stream Response
	return result.toUIMessageStreamResponse();
};