import { createId } from '@paralleldrive/cuid2';
import { toast } from '$lib/stores/toast.store.svelte';
import type { Chat, Folder, Note, Highlight } from '$lib/server/db/schema';

export type SearchResult = {
	messageId: string;
	chatId: string;
	chatTitle: string;
	content: string;
	role: string;
	score: number;
};

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
	secondaryPanelTab = $state<'notes' | 'highlights' | 'search' | 'closed'>('closed');
	searchResults = $state<SearchResult[]>([]);
	searchQuery = $state('');

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

	async updateModel(id: string, modelId: string): Promise<void> {
		const idx = this.chats.findIndex((c) => c.id === id);
		if (idx === -1) return;

		const prevModelId = this.chats[idx].modelId;
		this.chats[idx] = { ...this.chats[idx], modelId };

		try {
			const res = await fetch(`/api/chats/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ modelId })
			});
			if (!res.ok) throw new Error('Server error');
		} catch {
			const i = this.chats.findIndex((c) => c.id === id);
			if (i !== -1) this.chats[i] = { ...this.chats[i], modelId: prevModelId };
			toast.error('Failed to update model');
		}
	}

	async truncateAfter(chatId: string, messageId: string): Promise<void> {
		const res = await fetch(`/api/chats/${chatId}/messages/after`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId })
		});
		if (!res.ok) {
			toast.error('Failed to truncate messages');
			throw new Error('truncateAfter failed');
		}
	}

	async truncateFrom(chatId: string, messageId: string): Promise<void> {
		const res = await fetch(`/api/chats/${chatId}/messages/after`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId, inclusive: true })
		});
		if (!res.ok) {
			toast.error('Failed to truncate messages');
			throw new Error('truncateFrom failed');
		}
	}

	async cloneChat(chatId: string, upToMessageId: string): Promise<string> {
		const res = await fetch(`/api/chats/${chatId}/clone`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ upToMessageId })
		});
		if (!res.ok) {
			toast.error('Failed to clone chat');
			throw new Error('cloneChat failed');
		}
		const cloned: Chat = await res.json();
		this.chats.unshift(cloned);
		return cloned.id;
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
	}

	// ==========================================
	// 7. KNOWLEDGE MUTATIONS
	// ==========================================

	async loadChatKnowledge(chatId: string): Promise<void> {
		const [notesRes, highlightsRes] = await Promise.all([
			fetch(`/api/notes?chatId=${chatId}`),
			fetch(`/api/chats/${chatId}/highlights`)
		]);
		this.notes = notesRes.ok ? await notesRes.json() : [];
		this.highlights = highlightsRes.ok ? await highlightsRes.json() : [];
	}

	async saveNote(chatId: string, content: string): Promise<void> {
		const existing = this.notes.find((n) => n.chatId === chatId);
		if (existing) {
			await fetch(`/api/notes/${existing.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});
			const idx = this.notes.findIndex((n) => n.id === existing.id);
			if (idx !== -1) this.notes[idx] = { ...this.notes[idx], content };
		} else {
			const res = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId, content })
			});
			if (res.ok) {
				const note = await res.json();
				this.notes.push(note);
			}
		}
	}

	async saveHighlight(messageId: string, text: string): Promise<void> {
		const res = await fetch('/api/highlights', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId, text })
		});
		if (res.ok) {
			const highlight = await res.json();
			this.highlights.push(highlight);
			toast.success('Highlight saved');
		} else {
			toast.error('Failed to save highlight');
		}
	}

	async deleteHighlight(id: string): Promise<void> {
		const snapshot = [...this.highlights];
		this.highlights = this.highlights.filter((h) => h.id !== id);
		const res = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			this.highlights = snapshot;
			toast.error('Failed to delete highlight');
		}
	}

	// ==========================================
	// 8. SEMANTIC SEARCH
	// ==========================================

	async search(query: string): Promise<void> {
		this.searchQuery = query;
		if (!query.trim()) {
			this.searchResults = [];
			return;
		}
		try {
			const res = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, limit: 8 })
			});
			if (res.ok) {
				this.searchResults = await res.json();
			}
		} catch {
			toast.error('Search failed');
		}
	}
}

export const app = new AppState();
