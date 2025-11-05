import type { ChatConfig, Message } from '$lib/types/chat';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { AppError } from '$lib/utils/error-handler';

// Define a common interface for all AI providers
export interface AIProvider {
	generate(
		chatId: string,
		messages: Message[],
		config: ChatConfig['modelConfig']
	): Promise<ReadableStream>;
}

// A map of available providers
const providers: Record<string, AIProvider> = {
	openai: new OpenAIProvider(),
	anthropic: new AnthropicProvider()
};

// Factory function to get the correct provider
export function getAIProvider(providerName: string): AIProvider {
	const provider = providers[providerName];
	if (!provider) {
		throw new AppError(`Unsupported AI provider: ${providerName}`, 'CONFIG_ERROR');
	}
	return provider;
}