// src/lib/server/repositories/tag.repository.ts
// UPDATED VERSION - adds findByName and findOrCreate methods

import { db } from '$lib/server/db';
import { tags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Tag, CreateTagDTO } from '$lib/types/tag';

export class TagRepository {
	/**
	 * Create a new tag
	 */
	async create(data: CreateTagDTO): Promise<Tag> {
		const [tag] = await db
			.insert(tags)
			.values({
				userId: data.userId,
				name: data.name,
				color: data.color,
				type: data.type,
				createdAt: new Date()
			})
			.returning();

		return this.mapToDomain(tag);
	}

	/**
	 * Find tag by ID
	 */
	async findById(tagId: number): Promise<Tag | null> {
		const result = await db.query.tags.findFirst({
			where: eq(tags.id, tagId)
		});

		return result ? this.mapToDomain(result) : null;
	}

	/**
	 * Find all tags for a user by type
	 */
	async findByUserIdAndType(
		userId: number,
		type: 'CHAT' | 'MESSAGE' | 'NOTE'
	): Promise<Tag[]> {
		const results = await db.query.tags.findMany({
			where: and(eq(tags.userId, userId), eq(tags.type, type))
		});

		return results.map((r) => this.mapToDomain(r));
	}

	/**
	 * Find all tags for a user
	 */
	async findByUserId(userId: number): Promise<Tag[]> {
		const results = await db.query.tags.findMany({
			where: eq(tags.userId, userId)
		});

		return results.map((r) => this.mapToDomain(r));
	}

	/**
	 * Find tag by name (ADDED)
	 */
	async findByName(name: string, userId: number, type: 'CHAT' | 'MESSAGE' | 'NOTE'): Promise<Tag | null> {
		const result = await db.query.tags.findFirst({
			where: and(
				eq(tags.name, name),
				eq(tags.userId, userId),
				eq(tags.type, type)
			)
		});

		return result ? this.mapToDomain(result) : null;
	}

	/**
	 * Find or create tag by name (ADDED)
	 * Useful for auto-creating tags when applying them to items
	 */
	async findOrCreate(name: string, userId: number, type: 'CHAT' | 'MESSAGE' | 'NOTE'): Promise<Tag> {
		const existing = await this.findByName(name, userId, type);
		if (existing) return existing;

		return this.create({ userId, name, type });
	}

	/**
	 * Delete a tag
	 */
	async delete(tagId: number): Promise<void> {
		await db.delete(tags).where(eq(tags.id, tagId));
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any): Tag {
		return {
			id: record.id.toString(),
			userId: record.userId,
			name: record.name,
			color: record.color,
			type: record.type,
			createdAt: record.createdAt
		};
	}
}

// Export singleton instance
export const tagRepository = new TagRepository();