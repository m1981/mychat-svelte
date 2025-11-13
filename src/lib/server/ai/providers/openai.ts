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
		// FIX: Adapt the OpenAI SDK's async iterable stream to a standard ReadableStream
		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content || '';
						if (content) {
							finalContent += content;
							const jsonChunk = JSON.stringify({ type: 'chunk', content });
							controller.enqueue(new TextEncoder().encode(jsonChunk + '\n'));
						}
					}

				// When the loop finishes, persist the final message.
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
					}
				}
				controller.close();
			},
			cancel() {
				console.log('[OpenAIProvider] Stream cancelled by client.');
			}
		});

		return readableStream;
	}
}
