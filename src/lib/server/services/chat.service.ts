import { chatRepository } from '$lib/server/repositories/chat.repository';
import type { Chat, ChatConfig, Reference } from '$lib/types/chat';
import type { CreateChatDTO, UpdateChatDTO } from '$lib/server/repositories/chat.repository';

export class ChatService {
	/**
	 * Create a new chat
	 */
	async createChat(userId: number, data: Omit<CreateChatDTO, 'userId'>): Promise<Chat> {
		return chatRepository.create({ ...data, userId });
	}

	/**
	 * Get a chat by ID
	 */
	async getChat(chatId: string, userId: number): Promise<Chat> {
		const chat = await chatRepository.findById(chatId, userId);
		if (!chat) {
			throw new Error('Chat not found');
		}
		return chat;
	}

	/**
	 * Get all chats for a user
	 */
	async getUserChats(userId: number, options?: any): Promise<{ chats: Chat[]; total: number }> {
		return chatRepository.findByUserId(userId, options);
	}

	/**
	 * Update chat metadata
	 */
	async updateChat(chatId: string, userId: number, data: UpdateChatDTO): Promise<Chat> {
		return chatRepository.update(chatId, userId, data);
	}

	/**
	 * Delete a chat
	 */
	async deleteChat(chatId: string, userId: number): Promise<void> {
		return chatRepository.delete(chatId, userId);
	}

	/**
	 * Add a message to a chat
	 */
	async addMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string) {
		return chatRepository.addMessage(chatId, role, content);
	}

	/**
	 * Build context string from references
	 * Used for providing additional context to AI prompts
	 */
	async buildContextFromReferences(references: Reference[], userId: number): Promise<string> {
		if (references.length === 0) return '';

		let context = '--- Context from References ---\n\n';

		for (const ref of references) {
			if (ref.type === 'CHAT') {
				const chat = await chatRepository.findById(ref.targetId, userId);
				if (chat) {
					context += `[Chat: ${chat.title}]\n`;
					context += chat.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
					context += '\n\n';
				}
			} else if (ref.type === 'FOLDER') {
				const { chats } = await chatRepository.findByUserId(userId, {
					folderId: ref.targetId,
					limit: 10
				});
				context += `[Folder: ${ref.title}] (${chats.length} chats)\n`;
				context += chats.map((c) => `- ${c.title}`).join('\n');
				context += '\n\n';
			}
			// Note: Can extend to handle NOTE and MESSAGE references
		}

		context += '--- End Context ---\n\n';
		return context;
	}
}

// Export singleton instance
export const chatService = new ChatService();
