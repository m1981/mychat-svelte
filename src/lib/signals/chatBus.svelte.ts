// src/lib/signals/chatBus.svelte.ts
type ChatEvents = {
  'chat:created': Chat;
  'chat:updated': Chat;
  'chat:deleted': string;
  'chat:selected': string;
  'folder:created': Folder;
  'folder:updated': Folder;
  'folder:deleted': string;
  'message:streaming': { chatId: string; content: string };
  'note:created': Note;
  'note:updated': Note;
  'note:deleted': string;
  'highlight:created': Highlight;
  'highlight:updated': Highlight;
  'highlight:deleted': string;
};

class SignalBus<T extends Record<string, any>> {
  #listeners = $state<Map<keyof T, Set<Function>>>(new Map());

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(callback);

    return () => this.#listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.#listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const chatBus = new SignalBus<ChatEvents>();