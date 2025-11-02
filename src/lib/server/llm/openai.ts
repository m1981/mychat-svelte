import OpenAI from 'openai';
import type { Message, ModelConfig } from '$lib/types/chat';
import { env } from '$env/dynamic/private';

export class OpenAIService {
	private client: OpenAI;

	constructor(apiKey?: string) {
		this.client = new OpenAI({
			apiKey: apiKey || env.OPENAI_API_KEY
		});
	}

	/**
	 * Send a message to OpenAI and get a streaming response
	 */
	async *streamCompletion(
		messages: Message[],
		config: ModelConfig
	): AsyncGenerator<string, void, unknown> {
		const stream = await this.client.chat.completions.create({
			model: config.model,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			max_tokens: config.max_tokens,
			temperature: config.temperature,
			top_p: config.top_p,
			presence_penalty: config.presence_penalty,
			frequency_penalty: config.frequency_penalty,
			stream: true
		});

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || '';
			if (content) {
				yield content;
			}
		}
	}

	/**
	 * Send a message to OpenAI and get a complete response (non-streaming)
	 */
	async getCompletion(messages: Message[], config: ModelConfig): Promise<string> {
		const response = await this.client.chat.completions.create({
			model: config.model,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			max_tokens: config.max_tokens,
			temperature: config.temperature,
			top_p: config.top_p,
			presence_penalty: config.presence_penalty,
			frequency_penalty: config.frequency_penalty
		});

		return response.choices[0]?.message?.content || '';
	}
}
