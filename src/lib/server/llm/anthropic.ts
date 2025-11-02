import Anthropic from '@anthropic-ai/sdk';
import type { Message, ModelConfig } from '$lib/types/chat';
import { env } from '$env/dynamic/private';

export class AnthropicService {
	private client: Anthropic;

	constructor(apiKey?: string) {
		this.client = new Anthropic({
			apiKey: apiKey || env.ANTHROPIC_API_KEY
		});
	}

	/**
	 * Send a message to Anthropic and get a streaming response
	 */
	async *streamCompletion(
		messages: Message[],
		config: ModelConfig
	): AsyncGenerator<string, void, unknown> {
		// Separate system messages from other messages
		const systemMessages = messages.filter((m) => m.role === 'system');
		const nonSystemMessages = messages.filter((m) => m.role !== 'system');

		const stream = await this.client.messages.create({
			model: config.model,
			max_tokens: config.max_tokens,
			temperature: config.temperature,
			top_p: config.top_p,
			system: systemMessages.length > 0 ? systemMessages[0].content : undefined,
			messages: nonSystemMessages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			stream: true
		});

		for await (const chunk of stream) {
			if (
				chunk.type === 'content_block_delta' &&
				chunk.delta.type === 'text_delta'
			) {
				yield chunk.delta.text;
			}
		}
	}

	/**
	 * Send a message to Anthropic and get a complete response (non-streaming)
	 */
	async getCompletion(messages: Message[], config: ModelConfig): Promise<string> {
		// Separate system messages from other messages
		const systemMessages = messages.filter((m) => m.role === 'system');
		const nonSystemMessages = messages.filter((m) => m.role !== 'system');

		const response = await this.client.messages.create({
			model: config.model,
			max_tokens: config.max_tokens,
			temperature: config.temperature,
			top_p: config.top_p,
			system: systemMessages.length > 0 ? systemMessages[0].content : undefined,
			messages: nonSystemMessages.map((m) => ({
				role: m.role,
				content: m.content
			}))
		});

		const textContent = response.content.find((c) => c.type === 'text');
		return textContent && textContent.type === 'text' ? textContent.text : '';
	}
}
