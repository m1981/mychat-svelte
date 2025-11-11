// src/lib/services/chatService.svelte.ts
import { chatBus } from '$lib/signals/chatBus.svelte';
import { uiBus } from '$lib/signals/uiBus.svelte';
import { chatRepository } from '$lib/server/repositories/chat.repository';
import { syncService } from './sync.service';

class ChatService {
  #cache = $state<Map<string, Chat>>(new Map());

  async createChat(data: Partial<Chat>): Promise<Chat> {
    const chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const newChat: Chat = {
      id: chatId,
      userId: 1, // TODO: Get from auth
      title: data.title || 'New Chat',
      folderId: data.folderId,
      messages: data.messages || [],
      config: data.config || this.#getDefaultConfig(),
      tags: data.tags || [],
      metadata: { tokenCount: 0, messageCount: 0, lastMessageAt: now },
      createdAt: now,
      updatedAt: now
    };

    // 1. Save locally first (optimistic)
    this.#cache.set(chatId, newChat);

    // 2. Emit event (stores and UI react)
    chatBus.emit('chat:created', newChat);

    // 3. Queue for server sync
    await syncService.queueOperation('CREATE', 'CHAT', chatId, newChat);

    // 4. Show success toast
    uiBus.showToast('Chat created successfully', 'success');

    return newChat;
  }

  async deleteChat(chatId: string): Promise<void> {
    // 1. Show confirmation modal
    const confirmed = await uiBus.confirm('Delete this chat? This cannot be undone.');
    if (!confirmed) return;

    // 2. Delete from cache
    const chat = this.#cache.get(chatId);
    this.#cache.delete(chatId);

    // 3. Emit event
    chatBus.emit('chat:deleted', chatId);

    // 4. Queue for sync
    await syncService.queueOperation('DELETE', 'CHAT', chatId, null);

    // 5. Show toast
    uiBus.showToast('Chat deleted', 'success');
  }

  #getDefaultConfig(): ChatConfig {
    return {
      provider: 'anthropic',
      modelConfig: {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0
      }
    };
  }
}

export const chatService = new ChatService();