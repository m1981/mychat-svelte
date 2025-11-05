// src/lib/server/ai/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import type { AIProvider } from './index';
import type { ChatConfig, Message } from '$lib/types/chat';
import { AppError } from '$lib/utils/error-handler';
import { db } from '$lib/server/db';
import { messages as messagesTable } from '$lib/server/db/schema';

export class AnthropicProvider implements AIProvider {
	private anthropic: Anthropic;

	constructor() {
		if (!env.ANTHROPIC_API_KEY) {
			throw new AppError('Anthropic API key is not configured.', 'CONFIG_ERROR');
		}
		this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	}

	private formatMessages(messages: Message[]): Anthropic.Messages.MessageParam[] {
		return messages
			.filter((msg) => msg.role === 'user' || msg.role === 'assistant')
			.map((msg) => ({ role: msg.role, content: msg.content })) as Anthropic.Messages.MessageParam[];
	}

	async generate(
		chatId: string,
		messages: Message[],
		config: ChatConfig['modelConfig']
	): Promise<ReadableStream> {
		const anthropicStream = await this.anthropic.messages.stream({
			model: config.model,
			messages: this.formatMessages(messages),
			max_tokens: config.max_tokens,
			temperature: config.temperature
		});

		let finalContent = '';
		const readableStream = new ReadableStream({
			async start(controller) {
				for await (const chunk of anthropicStream) {
					if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
						const content = chunk.delta.text;
						if (content) {
						finalContent += content;
							const jsonChunk = JSON.stringify({ type: 'chunk', content });
						controller.enqueue(new TextEncoder().encode(jsonChunk + '\n'));
					}
						}
				}
				// When the loop finishes, the stream is done. Persist the final message.
				if (finalContent) {
					try {
						await db.insert(messagesTable).values({
							chatId: chatId,
							role: 'assistant',
							content: finalContent
						});
						console.log(`✅ [AnthropicProvider] Persisted assistant response for chat ${chatId}`);
					} catch (err) {
						console.error(`🚨 [AnthropicProvider] Failed to persist AI response for chat ${chatId}:`, err);
					}
				}
				controller.close();
			},
			cancel() {
				console.log('[AnthropicProvider] Stream cancelled by client.');
			}
		});

		return readableStream;
	}
}