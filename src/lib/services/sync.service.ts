// src/lib/services/sync.service.ts
/**
 * Sync Service - Handles bidirectional sync between local IndexedDB and server
 * Implements optimistic updates with conflict resolution
 */

import { localDB, type SyncOperation } from './local-db';
import { writable, get } from 'svelte/store';
import type { Chat, Folder } from '$lib/types/chat';

export interface SyncStatus {
	isOnline: boolean;
	isSyncing: boolean;
	lastSyncTime: Date | null;
	pendingOperations: number;
	failedOperations: number;
}

class SyncService {
	private syncStatus = writable<SyncStatus>({
		isOnline: navigator.onLine,
		isSyncing: false,
		lastSyncTime: null,
		pendingOperations: 0,
		failedOperations: 0
	});

	private syncInterval: number | null = null;
	private isInitialized = false;

	// Subscribe to sync status
	public status = {
		subscribe: this.syncStatus.subscribe
	};

	/**
	 * Initialize sync service
	 */
	async init(): Promise<void> {
		if (this.isInitialized) return;

		// Initialize IndexedDB
		await localDB.init();

		// Load last sync time
		const lastSyncTime = await localDB.getLastSyncTime();
		this.updateStatus({ lastSyncTime });

		// Setup online/offline listeners
		window.addEventListener('online', () => this.handleOnline());
		window.addEventListener('offline', () => this.handleOffline());

		// Start periodic sync (every 30 seconds when online)
		this.startPeriodicSync();

		// Initial sync if online
		if (navigator.onLine) {
			await this.sync();
		}

		this.isInitialized = true;
		console.log('✅ Sync service initialized');
	}

	/**
	 * Handle coming back online
	 */
	private handleOnline(): void {
		console.log('🌐 Back online - starting sync');
		this.updateStatus({ isOnline: true });
		this.sync();
	}

	/**
	 * Handle going offline
	 */
	private handleOffline(): void {
		console.log('📴 Offline mode - operations will be queued');
		this.updateStatus({ isOnline: false });
	}

	/**
	 * Start periodic background sync
	 */
	private startPeriodicSync(): void {
		if (this.syncInterval) return;

		this.syncInterval = window.setInterval(async () => {
			if (navigator.onLine && !get(this.syncStatus).isSyncing) {
				await this.sync();
			}
		}, 30000); // 30 seconds
	}

	/**
	 * Stop periodic sync
	 */
	private stopPeriodicSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	/**
	 * Main sync function - bidirectional sync
	 */
	async sync(): Promise<void> {
		if (!navigator.onLine) {
			console.log('⚠️ Offline - skipping sync');
			return;
		}

		const status = get(this.syncStatus);
		if (status.isSyncing) {
			console.log('⏳ Sync already in progress');
			return;
		}

		this.updateStatus({ isSyncing: true });

		try {
			// Step 1: Push local changes to server
			await this.pushLocalChanges();

			// Step 2: Pull server changes to local
			await this.pullServerChanges();

			// Step 3: Update sync time
			const now = new Date();
			await localDB.setLastSyncTime(now);
			this.updateStatus({ lastSyncTime: now });

			console.log('✅ Sync completed successfully');
		} catch (error) {
			console.error('❌ Sync failed:', error);
		} finally {
			this.updateStatus({ isSyncing: false });
			await this.updatePendingCount();
		}
	}

	/**
	 * Push local changes to server
	 */
	private async pushLocalChanges(): Promise<void> {
		const queue = await localDB.getSyncQueue();

		console.log(`📤 Pushing ${queue.length} operations to server`);

		for (const operation of queue) {
			try {
				await this.executeSyncOperation(operation);
				await localDB.removeFromSyncQueue(operation.id);
			} catch (error) {
				console.error(`Failed to sync operation ${operation.id}:`, error);

				// Retry logic
				operation.retries++;
				operation.error = error instanceof Error ? error.message : 'Unknown error';

				if (operation.retries >= 3) {
					console.error(`Operation ${operation.id} failed after 3 retries`);
					// Keep in queue but mark as failed
				}

				await localDB.updateSyncOperation(operation);
			}
		}
	}

	/**
	 * Pull changes from server
	 */
	private async pullServerChanges(): Promise<void> {
		const lastSyncTime = await localDB.getLastSyncTime();

		console.log(`📥 Pulling changes since ${lastSyncTime || 'beginning'}`);

		try {
			// Fetch chats updated since last sync
			const chatsResponse = await fetch('/api/sync/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lastSyncTime: lastSyncTime?.toISOString() })
			});

			if (chatsResponse.ok) {
				const { chats } = await chatsResponse.json();
				for (const chat of chats) {
					await localDB.saveChat(chat);
				}
				console.log(`✅ Synced ${chats.length} chats from server`);
			}

			// Fetch folders updated since last sync
			const foldersResponse = await fetch('/api/sync/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lastSyncTime: lastSyncTime?.toISOString() })
			});

			if (foldersResponse.ok) {
				const { folders } = await foldersResponse.json();
				for (const folder of folders) {
					await localDB.saveFolder(folder);
				}
				console.log(`✅ Synced ${folders.length} folders from server`);
			}
		} catch (error) {
			console.error('Failed to pull server changes:', error);
			throw error;
		}
	}

	/**
	 * Execute a single sync operation
	 */
	private async executeSyncOperation(operation: SyncOperation): Promise<void> {
		const { type, entity, entityId, data } = operation;

		let endpoint = '';
		let method = '';

		switch (entity) {
			case 'CHAT':
				endpoint = type === 'DELETE' ? `/api/chats/${entityId}` : '/api/chats';
				break;
			case 'FOLDER':
				endpoint = type === 'DELETE' ? `/api/folders/${entityId}` : '/api/folders';
				break;
			case 'NOTE':
				endpoint = type === 'DELETE' ? `/api/notes/${entityId}` : '/api/notes';
				break;
			case 'HIGHLIGHT':
				endpoint = type === 'DELETE' ? `/api/highlights/${entityId}` : '/api/highlights';
				break;
			default:
				throw new Error(`Unknown entity type: ${entity}`);
		}

		switch (type) {
			case 'CREATE':
				method = 'POST';
				break;
			case 'UPDATE':
				method = 'PATCH';
				endpoint = `${endpoint}/${entityId}`;
				break;
			case 'DELETE':
				method = 'DELETE';
				break;
		}

		const response = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: type !== 'DELETE' ? JSON.stringify(data) : undefined
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || `Server error: ${response.status}`);
		}
	}

	/**
	 * Queue an operation for sync
	 */
	async queueOperation(
		type: SyncOperation['type'],
		entity: SyncOperation['entity'],
		entityId: string,
		data: any
	): Promise<void> {
		await localDB.addToSyncQueue({
			type,
			entity,
			entityId,
			data,
			timestamp: new Date(),
			retries: 0
		});

		await this.updatePendingCount();

		// Try to sync immediately if online
		if (navigator.onLine) {
			this.sync();
		}
	}

	/**
	 * Update pending operations count
	 */
	private async updatePendingCount(): Promise<void> {
		const queue = await localDB.getSyncQueue();
		const failedCount = queue.filter((op) => op.retries >= 3).length;

		this.updateStatus({
			pendingOperations: queue.length,
			failedOperations: failedCount
		});
	}

	/**
	 * Update sync status
	 */
	private updateStatus(updates: Partial<SyncStatus>): void {
		this.syncStatus.update((current) => ({ ...current, ...updates }));
	}

	/**
	 * Force immediate sync
	 */
	async forceSync(): Promise<void> {
		console.log('🔄 Force sync requested');
		await this.sync();
	}

	/**
	 * Clear failed operations
	 */
	async clearFailedOperations(): Promise<void> {
		const queue = await localDB.getSyncQueue();
		const failed = queue.filter((op) => op.retries >= 3);

		for (const op of failed) {
			await localDB.removeFromSyncQueue(op.id);
		}

		await this.updatePendingCount();
	}

	/**
	 * Get retry queue for debugging
	 */
	async getRetryQueue(): Promise<SyncOperation[]> {
		return localDB.getSyncQueue();
	}

	/**
	 * Cleanup on app close
	 */
	destroy(): void {
		this.stopPeriodicSync();
		window.removeEventListener('online', () => this.handleOnline());
		window.removeEventListener('offline', () => this.handleOffline());
		localDB.close();
	}
}

// Singleton instance
export const syncService = new SyncService();