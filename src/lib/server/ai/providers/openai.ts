import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { AIProvider } from './index';
import type { ChatConfig, Message } from '$lib/types/chat';
import { AppError } from '$lib/utils/error-handler';
import { db } from '$lib/server/db';
import { messages as messagesTable } from '$lib/server/db/schema';

export class OpenAIProvider implements AIProvider {
	private openai: OpenAI;

	constructor() {
		if (!env.OPENAI_API_KEY) {
			throw new AppError('OpenAI API key is not configured.', 'CONFIG_ERROR', 500);
		}
		this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	}

	async generate(
		chatId: string,
		messages: Message[],
		config: ChatConfig['modelConfig']
	): Promise<ReadableStream> {
		const stream = await this.openai.chat.completions.create({
			model: config.model,
			messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
			temperature: config.temperature,
			max_tokens: config.max_tokens,
			stream: true
		});

		let finalContent = '';
		const transformStream = new TransformStream({
			async transform(chunk, controller) {
				// Assuming chunk is a Uint8Array from the OpenAI stream
				const text = new TextDecoder().decode(chunk);
				// OpenAI streams send SSE events, often prefixed with "data: "
				const lines = text.split('\n').filter((line) => line.trim().startsWith('data: '));

				for (const line of lines) {
					const data = line.replace(/^data: /, '');
					if (data === '[DONE]') {
						return; // Stream finished
					}
					try {
						const parsed = JSON.parse(data);
						const content = parsed.choices[0]?.delta?.content || '';
						if (content) {
							finalContent += content;
							const jsonChunk = JSON.stringify({ type: 'chunk', content });
							controller.enqueue(new TextEncoder().encode(jsonChunk + '\n'));
						}
					} catch (error) {
						console.error('Could not parse stream chunk:', data);
					}
				}
			},
			async flush() {
				// This 'flush' method is called when the source stream is done.
				// This is the perfect place to persist the final message.
				if (finalContent) {
					try {
						await db.insert(messagesTable).values({
							chatId: chatId,
							role: 'assistant',
							content: finalContent
						});
						console.log(`✅ [OpenAIProvider] Persisted assistant response for chat ${chatId}`);
					} catch (err) {
						console.error(`🚨 [OpenAIProvider] Failed to persist AI response for chat ${chatId}:`, err);
						// In a production app, you might add this to a retry queue.
					}
				}
			}
		});

		return stream.body!.pipeThrough(transformStream);
	}
}
