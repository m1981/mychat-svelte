// src/lib/stores/chatStore.svelte.ts
import { chatBus } from '$lib/signals/chatBus.svelte';

class ChatStore {
  #chats = $state<Chat[]>([]);
  #activeChat = $state<Chat | null>(null);

  // Derived state
  get chats() {
    return this.#chats;
  }

  get activeChat() {
    return this.#activeChat;
  }

  get chatCount() {
    return this.#chats.length;
  }

  constructor() {
    // Subscribe to signal bus events
    chatBus.on('chat:created', (chat) => {
      this.#chats = [...this.#chats, chat];
    });

    chatBus.on('chat:updated', (chat) => {
      this.#chats = this.#chats.map(c => c.id === chat.id ? chat : c);
    });

    chatBus.on('chat:deleted', (chatId) => {
      this.#chats = this.#chats.filter(c => c.id !== chatId);
      if (this.#activeChat?.id === chatId) {
        this.#activeChat = null;
      }
    });

    chatBus.on('chat:selected', (chatId) => {
      this.#activeChat = this.#chats.find(c => c.id === chatId) || null;
    });
  }

  setActiveChat(chatId: string) {
    this.#activeChat = this.#chats.find(c => c.id === chatId) || null;
  }

  initialize(chats: Chat[]) {
    this.#chats = chats;
  }
}

export const chatStore = new ChatStore();