// File: src/lib/server/ai/providers/index.ts
import type { ChatConfig, Message } from '$lib/types/models';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { AppError } from '$lib/utils/error-handler';

export interface AIProvider {
	generateStream(
		messages: Message[],
		config: ChatConfig['modelConfig']
	): Promise<ReadableStream>;
}

const providers: Record<string, AIProvider> = {
	openai: new OpenAIProvider(),
	anthropic: new AnthropicProvider()
};

export function getAIProvider(providerName: string): AIProvider {
	const provider = providers[providerName];
	if (!provider) {
		throw new AppError(`Unsupported AI provider: ${providerName}`, 'CONFIG_ERROR');
	}
	return provider;
}