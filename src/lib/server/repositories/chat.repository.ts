import { db } from '$lib/server/db';
import { chats, messages, chatTags, tags, folders } from '$lib/server/db/schema';
import { eq, and, desc, asc, inArray, like } from 'drizzle-orm';
import type { Chat, Message, ChatConfig, ChatMetadata } from '$lib/types/chat';
import { generateId } from './base.repository';

export interface CreateChatDTO {
	userId: number;
	title?: string;
	folderId?: string;
	config: ChatConfig;
	tags?: string[];
}

export interface UpdateChatDTO {
	title?: string;
	folderId?: string | null;
	config?: Partial<ChatConfig>;
}

export interface FindChatsOptions {
	page?: number;
	limit?: number;
	folderId?: string;
	sortBy?: 'createdAt' | 'updatedAt' | 'title';
	sortOrder?: 'asc' | 'desc';
}

export class ChatRepository {
	/**
	 * Create a new chat
	 */
	async create(data: CreateChatDTO): Promise<Chat> {
		const chatId = generateId('chat');

		const [newChat] = await db
			.insert(chats)
			.values({
				id: chatId,
				userId: data.userId,
				title: data.title || 'New Chat',
				folderId: data.folderId,
				config: data.config as any,
				metadata: {},
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		// Handle tags if provided
		if (data.tags && data.tags.length > 0) {
			await this.updateTags(chatId, data.tags, data.userId);
		}

		return this.mapToDomain(newChat, [], []);
	}

	/**
	 * Find chat by ID with full details
	 */
	async findById(chatId: string, userId: number): Promise<Chat | null> {
		const result = await db.query.chats.findFirst({
			where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
			with: {
				messages: {
					orderBy: [asc(messages.createdAt)],
					with: {
						highlights: true,
						messageTags: {
							with: { tag: true }
						}
					}
				},
				chatTags: {
					with: { tag: true }
				},
				notes: true,
				attachments: true
			}
		});

		if (!result) return null;

		return this.mapToDomain(
			result,
			result.messages || [],
			result.chatTags?.map((ct) => ct.tag) || []
		);
	}

	/**
	 * Find all chats for a user with pagination
	 */
	async findByUserId(
		userId: number,
		options: FindChatsOptions = {}
	): Promise<{ chats: Chat[]; total: number }> {
		const { page = 0, limit = 50, folderId, sortBy = 'updatedAt', sortOrder = 'desc' } = options;

		const whereConditions = [eq(chats.userId, userId)];

		if (folderId) {
			whereConditions.push(eq(chats.folderId, folderId));
		}

		const orderBy = sortOrder === 'desc' ? desc(chats[sortBy]) : asc(chats[sortBy]);

		const results = await db.query.chats.findMany({
			where: and(...whereConditions),
			orderBy: [orderBy],
			limit,
			offset: page * limit,
			with: {
				chatTags: {
					with: { tag: true }
				}
			}
		});

		// Get total count
		const totalResult = await db.select({ count: chats.id }).from(chats).where(and(...whereConditions));

		return {
			chats: results.map((r) => this.mapToDomain(r, [], r.chatTags?.map((ct) => ct.tag) || [])),
			total: totalResult.length
		};
	}

	/**
	 * Update chat metadata
	 */
	async update(chatId: string, userId: number, data: UpdateChatDTO): Promise<Chat> {
		const updateData: any = {
			updatedAt: new Date()
		};

		if (data.title !== undefined) updateData.title = data.title;
		if (data.folderId !== undefined) updateData.folderId = data.folderId;
		if (data.config) {
			// Merge config
			const existing = await this.findById(chatId, userId);
			if (existing) {
				updateData.config = { ...existing.config, ...data.config };
			}
		}

		await db.update(chats).set(updateData).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

		const updated = await this.findById(chatId, userId);
		if (!updated) throw new Error('Chat not found after update');

		return updated;
	}

	/**
	 * Delete a chat (cascade deletes messages, notes, etc.)
	 */
	async delete(chatId: string, userId: number): Promise<void> {
		await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
	}

	/**
	 * Add a message to a chat
	 */
	async addMessage(
		chatId: string,
		role: 'user' | 'assistant' | 'system',
		content: string
	): Promise<Message> {
		const [message] = await db
			.insert(messages)
			.values({
				chatId,
				role,
				content,
				createdAt: new Date()
			})
			.returning();

		// Update chat's updatedAt
		await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));

		return {
			id: message.id.toString(),
			chatId: message.chatId,
			role: message.role as 'user' | 'assistant' | 'system',
			content: message.content,
			tags: [],
			highlights: [],
			createdAt: message.createdAt
		};
	}

	/**
	 * Update chat tags
	 */
	private async updateTags(chatId: string, tagNames: string[], userId: number): Promise<void> {
		// Delete existing tags
		await db.delete(chatTags).where(eq(chatTags.chatId, chatId));

		if (tagNames.length === 0) return;

		// Find or create tags
		const tagRecords = await Promise.all(
			tagNames.map(async (name) => {
				const existing = await db.query.tags.findFirst({
					where: and(eq(tags.name, name), eq(tags.userId, userId), eq(tags.type, 'CHAT'))
				});

				if (existing) return existing;

				const [newTag] = await db
					.insert(tags)
					.values({
						userId,
						name,
						type: 'CHAT',
						createdAt: new Date()
					})
					.returning();

				return newTag;
			})
		);

		// Create associations
		await db.insert(chatTags).values(
			tagRecords.map((tag) => ({
				chatId,
				tagId: tag.id,
				createdAt: new Date()
			}))
		);
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any, messagesData: any[] = [], tagsData: any[] = []): Chat {
		return {
			id: record.id,
			userId: record.userId,
			title: record.title,
			folderId: record.folderId,
			messages: messagesData.map((m) => ({
				id: m.id.toString(),
				chatId: m.chatId,
				role: m.role,
				content: m.content,
				tags:
					m.messageTags?.map((mt: any) => ({
						id: mt.tag.id.toString(),
						name: mt.tag.name,
						color: mt.tag.color,
						type: mt.tag.type,
						createdAt: mt.tag.createdAt
					})) || [],
				highlights: m.highlights || [],
				createdAt: m.createdAt
			})),
			config: record.config as ChatConfig,
			tags: tagsData.map((t) => ({
				id: t.id.toString(),
				name: t.name,
				color: t.color,
				type: t.type,
				createdAt: t.createdAt
			})),
			metadata: (record.metadata as ChatMetadata) || {},
			createdAt: record.createdAt,
			updatedAt: record.updatedAt
		};
	}
}

// Export singleton instance
export const chatRepository = new ChatRepository();
