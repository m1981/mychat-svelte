import { db } from '$lib/server/db';
import { folders, type Folder, type NewFolder } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { generateId } from '$lib/server/utils/id-generator';

export class FolderRepository {
	/**
	 * Create a new folder
	 */
	async create(data: Omit<NewFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
		const id = generateId();
		const [folder] = await db
			.insert(folders)
			.values({
				id,
				...data
			})
			.returning();
		return folder;
	}

	/**
	 * Find folder by ID
	 */
	async findById(id: string): Promise<Folder | null> {
		const [folder] = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
		return folder || null;
	}

	/**
	 * Find all folders for a user
	 */
	async findByUserId(userId: number): Promise<Folder[]> {
		return await db
			.select()
			.from(folders)
			.where(eq(folders.userId, userId))
			.orderBy(folders.order, folders.name);
	}

	/**
	 * Find root folders (no parent)
	 */
	async findRootFolders(userId: number): Promise<Folder[]> {
		return await db
			.select()
			.from(folders)
			.where(and(eq(folders.userId, userId), isNull(folders.parentId)))
			.orderBy(folders.order, folders.name);
	}

	/**
	 * Find child folders
	 */
	async findChildFolders(parentId: string): Promise<Folder[]> {
		return await db
			.select()
			.from(folders)
			.where(eq(folders.parentId, parentId))
			.orderBy(folders.order, folders.name);
	}

	/**
	 * Update a folder
	 */
	async update(
		id: string,
		data: Partial<Pick<Folder, 'name' | 'parentId' | 'type' | 'expanded' | 'order' | 'color'>>
	): Promise<Folder | null> {
		const [updated] = await db
			.update(folders)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(folders.id, id))
			.returning();
		return updated || null;
	}

	/**
	 * Delete a folder
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db.delete(folders).where(eq(folders.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Toggle folder expanded state
	 */
	async toggleExpanded(id: string): Promise<Folder | null> {
		const folder = await this.findById(id);
		if (!folder) return null;

		return await this.update(id, { expanded: !folder.expanded });
	}

	/**
	 * Reorder folders
	 */
	async reorder(folderOrders: Array<{ id: string; order: number }>): Promise<void> {
		await db.transaction(async (tx) => {
			for (const { id, order } of folderOrders) {
				await tx
					.update(folders)
					.set({ order, updatedAt: new Date() })
					.where(eq(folders.id, id));
			}
		});
	}

	/**
	 * Get folder hierarchy (folder with all its children recursively)
	 */
	async getHierarchy(userId: number): Promise<FolderNode[]> {
		const allFolders = await this.findByUserId(userId);
		const folderMap = new Map<string, FolderNode>();

		// Convert to nodes
		for (const folder of allFolders) {
			folderMap.set(folder.id, {
				...folder,
				children: []
			});
		}

		// Build hierarchy
		const roots: FolderNode[] = [];
		for (const folder of allFolders) {
			const node = folderMap.get(folder.id)!;
			if (folder.parentId) {
				const parent = folderMap.get(folder.parentId);
				if (parent) {
					parent.children.push(node);
				}
			} else {
				roots.push(node);
			}
		}

		return roots;
	}
}

export interface FolderNode extends Folder {
	children: FolderNode[];
}

// Export singleton instance
export const folderRepository = new FolderRepository();
