import type { Message, ModelConfig } from '$lib/types/chat';
import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';

export type LLMProvider = 'openai' | 'anthropic';

export class LLMService {
	/**
	 * Get a streaming response from the specified LLM provider
	 */
	static async *streamCompletion(
		provider: LLMProvider,
		messages: Message[],
		config: ModelConfig
	): AsyncGenerator<string, void, unknown> {
		if (provider === 'openai') {
			const service = new OpenAIService();
			yield* service.streamCompletion(messages, config);
		} else if (provider === 'anthropic') {
			const service = new AnthropicService();
			yield* service.streamCompletion(messages, config);
		} else {
			throw new Error(`Unknown provider: ${provider}`);
		}
	}

	/**
	 * Get a complete response from the specified LLM provider (non-streaming)
	 */
	static async getCompletion(
		provider: LLMProvider,
		messages: Message[],
		config: ModelConfig
	): Promise<string> {
		if (provider === 'openai') {
			const service = new OpenAIService();
			return service.getCompletion(messages, config);
		} else if (provider === 'anthropic') {
			const service = new AnthropicService();
			return service.getCompletion(messages, config);
		} else {
			throw new Error(`Unknown provider: ${provider}`);
		}
	}
}
