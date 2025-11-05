// src/lib/server/repositories/folder.repository.ts

import { db } from '$lib/server/db';
import { folders } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { Folder } from '$lib/types/chat';
import { generateId } from './base.repository';

export interface CreateFolderDTO {
	userId: number;
	name: string;
	parentId?: string;
	type?: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
	color?: string;
}

export interface UpdateFolderDTO {
	name?: string;
	parentId?: string | null;
	color?: string;
	expanded?: boolean;
	order?: number;
}

export class FolderRepository {
	/**
	 * Create a new folder
	 */
	async create(data: CreateFolderDTO): Promise<Folder> {
		const folderId = generateId('folder');

		// Get max order for this parent level
		const siblings = await db.query.folders.findMany({
			where: data.parentId
				? eq(folders.parentId, data.parentId)
				: isNull(folders.parentId)
		});
		const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order || 0), 0);

		const [folder] = await db
			.insert(folders)
			.values({
				id: folderId,
				userId: data.userId,
				name: data.name,
				parentId: data.parentId,
				type: data.type || 'STANDARD',
				expanded: 1, // Using integer as boolean
				order: maxOrder + 1,
				color: data.color,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		return this.mapToDomain(folder);
	}

	/**
	 * Find folder by ID
	 */
	async findById(folderId: string, userId: number): Promise<Folder | null> {
		const result = await db.query.folders.findFirst({
			where: and(eq(folders.id, folderId), eq(folders.userId, userId))
		});

		return result ? this.mapToDomain(result) : null;
	}

	/**
	 * Find all folders for a user (flat list)
	 */
	async findByUserId(userId: number): Promise<Folder[]> {
		const results = await db.query.folders.findMany({
			where: eq(folders.userId, userId),
			orderBy: (folders, { asc }) => [asc(folders.order)]
		});

		return results.map((r) => this.mapToDomain(r));
	}

	/**
	 * Get folder hierarchy as tree structure
	 */
	async getFolderTree(userId: number): Promise<FolderNode[]> {
		const allFolders = await this.findByUserId(userId);
		return this.buildTree(allFolders);
	}

	/**
	 * Update folder
	 */
	async update(folderId: string, userId: number, data: UpdateFolderDTO): Promise<Folder> {
		const updateData: any = {
			updatedAt: new Date()
		};

		if (data.name !== undefined) updateData.name = data.name;
		if (data.parentId !== undefined) updateData.parentId = data.parentId;
		if (data.color !== undefined) updateData.color = data.color;
		if (data.expanded !== undefined) updateData.expanded = data.expanded ? 1 : 0;
		if (data.order !== undefined) updateData.order = data.order;

		await db
			.update(folders)
			.set(updateData)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

		const updated = await this.findById(folderId, userId);
		if (!updated) throw new Error('Folder not found after update');

		return updated;
	}

	/**
	 * Delete folder (with cascade option)
	 */
	async delete(folderId: string, userId: number): Promise<void> {
		// TODO: Check if folder has chats and handle cascade logic
		await db
			.delete(folders)
			.where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
	}

	/**
	 * Check if folder is empty (no chats)
	 */
	async isEmpty(folderId: string): Promise<boolean> {
		const result = await db.query.chats.findFirst({
			where: (chats, { eq }) => eq(chats.folderId, folderId)
		});
		return !result;
	}

	/**
	 * Build folder tree from flat list
	 */
	private buildTree(folders: Folder[]): FolderNode[] {
		const map = new Map<string, FolderNode>();
		const roots: FolderNode[] = [];

		// Create nodes
		folders.forEach((folder) => {
			map.set(folder.id, { ...folder, children: [] });
		});

		// Build tree
		folders.forEach((folder) => {
			const node = map.get(folder.id)!;
			if (folder.parentId) {
				const parent = map.get(folder.parentId);
				if (parent) {
					parent.children = parent.children || [];
					parent.children.push(node);
				} else {
					roots.push(node); // Parent not found, treat as root
				}
			} else {
				roots.push(node);
			}
		});

		return roots;
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any): Folder {
		return {
			id: record.id,
			userId: record.userId,
			name: record.name,
			parentId: record.parentId,
			type: record.type,
			expanded: record.expanded === 1,
			order: record.order,
			color: record.color,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt
		};
	}
}

// Helper type for tree structure
export interface FolderNode extends Folder {
	children?: FolderNode[];
}

// Export singleton instance
export const folderRepository = new FolderRepository();