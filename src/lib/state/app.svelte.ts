import { createId } from '@paralleldrive/cuid2';
import { toast } from '$lib/stores/toast.store.svelte';
import type { Chat, Folder, Note, Highlight } from '$lib/server/db/schema';

class AppState {
	// ==========================================
	// 1. CORE DATA (Populated on layout load)
	// ==========================================
	chats = $state<Chat[]>([]);
	folders = $state<Folder[]>([]);
	notes = $state<Note[]>([]);
	highlights = $state<Highlight[]>([]);

	// ==========================================
	// 2. UI STATE
	// ==========================================
	activeChatId = $state<string | null>(null);
	isSidebarOpen = $state(true);
	secondaryPanelTab = $state<'notes' | 'highlights' | 'closed'>('closed');

	// ==========================================
	// 3. DERIVED STATE
	// ==========================================
	get activeChat() {
		return this.chats.find((c) => c.id === this.activeChatId) ?? null;
	}

	get activeNotes() {
		return this.notes.filter((n) => n.chatId === this.activeChatId);
	}

	// ==========================================
	// 4. CHAT MUTATIONS
	// ==========================================

	async createChat(folderId?: string | null): Promise<string> {
		const id = createId();
		const now = new Date();
		const optimistic: Chat = {
			id,
			userId: 'optimistic',
			title: 'New Chat',
			modelId: 'claude-sonnet-4-6',
			folderId: folderId ?? null,
			tags: [],
			createdAt: now,
			updatedAt: now
		};

		this.chats.unshift(optimistic);

		try {
			const res = await fetch('/api/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, folderId: folderId ?? null })
			});
			if (!res.ok) throw new Error('Server error');
			const saved: Chat = await res.json();
			const idx = this.chats.findIndex((c) => c.id === id);
			if (idx !== -1) this.chats[idx] = saved;
		} catch {
			this.chats = this.chats.filter((c) => c.id !== id);
			toast.error('Failed to create chat');
			throw new Error('createChat failed');
		}

		return id;
	}

	async renameChat(id: string, title: string): Promise<void> {
		const idx = this.chats.findIndex((c) => c.id === id);
		if (idx === -1) return;

		const prevTitle = this.chats[idx].title;
		this.chats[idx] = { ...this.chats[idx], title };

		try {
			const res = await fetch(`/api/chats/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});
			if (!res.ok) throw new Error('Server error');
		} catch {
			const i = this.chats.findIndex((c) => c.id === id);
			if (i !== -1) this.chats[i] = { ...this.chats[i], title: prevTitle };
			toast.error('Failed to rename chat');
		}
	}

	async deleteChat(id: string): Promise<void> {
		const snapshot = [...this.chats];
		this.chats = this.chats.filter((c) => c.id !== id);

		try {
			const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Server error');
		} catch {
			this.chats = snapshot;
			toast.error('Failed to delete chat');
			throw new Error('deleteChat failed');
		}
	}

	// ==========================================
	// 5. FOLDER MUTATIONS
	// ==========================================

	async createFolder(name: string): Promise<void> {
		const id = createId();
		const optimistic: Folder = {
			id,
			userId: 'optimistic',
			name,
			order: this.folders.length,
			color: null,
			createdAt: new Date()
		};

		this.folders.push(optimistic);

		try {
			const res = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, name, order: optimistic.order })
			});
			if (!res.ok) throw new Error('Server error');
			const saved: Folder = await res.json();
			const idx = this.folders.findIndex((f) => f.id === id);
			if (idx !== -1) this.folders[idx] = saved;
		} catch {
			this.folders = this.folders.filter((f) => f.id !== id);
			toast.error('Failed to create folder');
		}
	}

	async renameFolder(id: string, name: string): Promise<void> {
		const idx = this.folders.findIndex((f) => f.id === id);
		if (idx === -1) return;

		const prevName = this.folders[idx].name;
		this.folders[idx] = { ...this.folders[idx], name };

		try {
			const res = await fetch(`/api/folders/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error('Server error');
		} catch {
			const i = this.folders.findIndex((f) => f.id === id);
			if (i !== -1) this.folders[i] = { ...this.folders[i], name: prevName };
			toast.error('Failed to rename folder');
		}
	}

	async deleteFolder(id: string): Promise<void> {
		const snapshotFolders = [...this.folders];
		const snapshotChats = [...this.chats];

		this.folders = this.folders.filter((f) => f.id !== id);
		// DB FK (onDelete: 'set null') handles DB side; mirror it in local state
		this.chats = this.chats.map((c) => (c.folderId === id ? { ...c, folderId: null } : c));

		try {
			const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Server error');
		} catch {
			this.folders = snapshotFolders;
			this.chats = snapshotChats;
			toast.error('Failed to delete folder');
		}
	}

	// ==========================================
	// 6. UI HELPERS
	// ==========================================

	setActiveChat(chatId: string) {
		this.activeChatId = chatId;
		if (this.secondaryPanelTab === 'closed') {
			this.secondaryPanelTab = 'notes';
		}
	}
}

export const app = new AppState();
