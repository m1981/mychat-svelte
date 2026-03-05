import { createId } from '@paralleldrive/cuid2';
import type { Chat, Folder, Note, Highlight } from '$lib/server/db/schema';

class AppState {
  // ==========================================
  // 1. CORE DATA (Populated by API)
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
  // 3. DERIVED STATE (Auto-calculates)
  // ==========================================
  get activeChat() {
    return this.chats.find(c => c.id === this.activeChatId) || null;
  }

  get activeNotes() {
    return this.notes.filter(n => n.chatId === this.activeChatId);
  }

  // ==========================================
  // 4. OPTIMISTIC MUTATIONS (The API Contract)
  // ==========================================

  // Example: Frontend dev calls this. It updates UI instantly.
  // Backend dev will later fill in the actual fetch() call.
  async createFolder(name: string) {
    const tempId = createId();
    const newFolder: Folder = {
      id: tempId,
      userId: 'temp-user', // Replaced by server
      name,
      order: this.folders.length,
      color: null,
      createdAt: new Date()
    };

    // 1. Optimistic UI Update
    this.folders.push(newFolder);

    try {
      // 2. The API Contract (Backend dev implements this endpoint)
      /*
      const res = await fetch('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ id: tempId, name })
      });
      if (!res.ok) throw new Error('Failed to save');
      */
    } catch (error) {
      // 3. Rollback on failure
      this.folders = this.folders.filter(f => f.id !== tempId);
      console.error("Failed to create folder", error);
      // TODO: Trigger global Toast error
    }
  }

  // Frontend dev uses this to switch chats and open the notes panel
  setActiveChat(chatId: string) {
    this.activeChatId = chatId;
    if (this.secondaryPanelTab === 'closed') {
      this.secondaryPanelTab = 'notes';
    }
  }
}

// Export a singleton instance for the whole app to use
export const app = new AppState();