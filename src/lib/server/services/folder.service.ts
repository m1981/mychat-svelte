// src/lib/server/services/folder.service.ts

import { folderRepository, type FolderNode } from '$lib/server/repositories/folder.repository';
import type { Folder } from '$lib/types/chat';
import type { CreateFolderDTO, UpdateFolderDTO } from '$lib/server/repositories/folder.repository';

export class FolderService {
	/**
	 * Create a new folder
	 */
	async createFolder(data: CreateFolderDTO): Promise<Folder> {
		// Validate max depth
		if (data.parentId) {
			const depth = await this.getFolderDepth(data.parentId, data.userId);
			if (depth >= 5) {
				throw new Error('Maximum folder depth (5) exceeded');
			}
		}

		return folderRepository.create(data);
	}

	/**
	 * Get a folder by ID
	 */
	async getFolder(folderId: string, userId: number): Promise<Folder> {
		const folder = await folderRepository.findById(folderId, userId);
		if (!folder) {
			throw new Error('Folder not found');
		}
		return folder;
	}

	/**
	 * Get all folders for a user
	 */
	async getUserFolders(userId: number): Promise<Folder[]> {
		return folderRepository.findByUserId(userId);
	}

	/**
	 * Get folder hierarchy as tree
	 */
	async getFolderTree(userId: number): Promise<FolderNode[]> {
		return folderRepository.getFolderTree(userId);
	}

	/**
	 * Update folder metadata
	 */
	async updateFolder(folderId: string, userId: number, data: UpdateFolderDTO): Promise<Folder> {
		// Validate parent change doesn't create cycle
		if (data.parentId !== undefined && data.parentId !== null) {
			const wouldCreateCycle = await this.wouldCreateCycle(folderId, data.parentId);
			if (wouldCreateCycle) {
				throw new Error('Cannot move folder: would create circular reference');
			}
		}

		return folderRepository.update(folderId, userId, data);
	}

	/**
	 * Delete a folder
	 */
	async deleteFolder(folderId: string, userId: number, cascade = false): Promise<void> {
		if (!cascade) {
			const isEmpty = await folderRepository.isEmpty(folderId);
			if (!isEmpty) {
				throw new Error('Folder is not empty. Use cascade=true to move chats to parent.');
			}
		}

		// TODO: If cascade=true, move chats to parent or root
		return folderRepository.delete(folderId, userId);
	}

	/**
	 * Calculate folder depth
	 */
	private async getFolderDepth(folderId: string, userId: number): Promise<number> {
		let depth = 0;
		let currentId: string | undefined = folderId;

		while (currentId && depth < 10) { // Safety limit
			const folder = await folderRepository.findById(currentId, userId);
			if (!folder) break;
			currentId = folder.parentId;
			depth++;
		}

		return depth;
	}

	/**
	 * Check if moving folder would create cycle
	 */
	private async wouldCreateCycle(
		folderId: string,
		newParentId: string | null
	): Promise<boolean> {
		if (!newParentId) return false;
		if (folderId === newParentId) return true;

		// Check if newParentId is a descendant of folderId
		let currentId: string | undefined = newParentId;
		const visited = new Set<string>();

		while (currentId && visited.size < 20) { // Safety limit
			if (currentId === folderId) return true;
			visited.add(currentId);

			const folder = await folderRepository.findById(currentId, 0); // userId doesn't matter for this check
			if (!folder) break;
			currentId = folder.parentId;
		}

		return false;
	}
}

// Export singleton instance
export const folderService = new FolderService();