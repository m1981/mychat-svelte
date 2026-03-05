// File: src/lib/server/ai/providers/openai.ts
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';
import type { AIProvider } from './index';
import type { ChatConfig, Message } from '$lib/types/models';
import { AppError } from '$lib/utils/error-handler';

export class OpenAIProvider implements AIProvider {
	private openai: OpenAI;

	constructor() {
		if (!env.OPENAI_API_KEY) {
			throw new AppError('OpenAI API key is not configured.', 'CONFIG_ERROR', 500);
		}
		this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	}

	async generateStream(
		messages: Message[],
		config: ChatConfig['modelConfig']
	): Promise<ReadableStream> {
		const stream = await this.openai.chat.completions.create({
			model: config.model,
			// Map our DB message format to OpenAI's format
			messages: messages.map(m => ({ role: m.role as any, content: m.content })),
			temperature: config.temperature,
			max_tokens: config.max_tokens,
			stream: true
		});

		return new ReadableStream({
			async start(controller) {
				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content || '';
					if (content) {
						const jsonChunk = JSON.stringify({ type: 'chunk', content });
						controller.enqueue(new TextEncoder().encode(jsonChunk + '\n'));
					}
				}
				controller.close();
			},
			cancel() {
				console.log('OpenAI Stream cancelled by client.');
			}
		});
	}
}