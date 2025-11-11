# SvelteKit v5 Architecture Best Practices with Signal Bus Pattern

## 1. **Architectural Layers & Responsibilities**

### **Layer 1: Routes (Pages) - The Orchestrator**
```svelte
<!-- src/routes/chat/+page.svelte -->
<script lang="ts">
  import { chatBus } from '$lib/signals/chatBus.svelte';
  import { chatService } from '$lib/services/chatService';
  import ChatList from '$lib/components/ChatList.svelte';
  
  // Routes are THIN - they coordinate, don't implement logic
  // Responsibility: Load data, connect services to UI
  
  let chats = $state(chatService.getChats());
  
  $effect(() => {
    // Subscribe to signal bus events
    const unsubscribe = chatBus.on('chat:created', (newChat) => {
      chats = [...chats, newChat];
    });
    return unsubscribe;
  });
</script>

<ChatList {chats} />
```

**Responsibilities:**
- Load initial data (from +page.ts/+page.server.ts)
- Connect signal bus to UI
- Coordinate between services and components
- Handle top-level error boundaries
- **DON'T**: Contain business logic, API calls, or complex state

---

### **Layer 2: Signal Bus - The Event Hub**
```typescript
// src/lib/signals/chatBus.svelte.ts
type ChatEvents = {
  'chat:created': Chat;
  'chat:updated': Chat;
  'chat:deleted': string;
  'folder:created': Folder;
  'message:streaming': { chatId: string; content: string };
};

class SignalBus<T extends Record<string, any>> {
  #listeners = $state<Map<keyof T, Set<Function>>>(new Map());

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.#listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.#listeners.get(event)?.forEach(cb => cb(data));
  }

  once<K extends keyof T>(event: K, callback: (data: T[K]) => void) {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }
}

export const chatBus = new SignalBus<ChatEvents>();
```

**Responsibilities:**
- Decoupled communication between components
- Cross-component events (e.g., modal triggers chat refresh)
- Global state changes that affect multiple parts of UI
- **DON'T**: Store state, contain business logic, make API calls

---

### **Layer 3: Services - The Business Logic**
```typescript
// src/lib/services/chatService.ts
import { chatBus } from '$lib/signals/chatBus.svelte';
import { chatApi } from '$lib/api/chatApi';

class ChatService {
  #cache = $state<Map<string, Chat>>(new Map());

  async createChat(data: CreateChatInput): Promise<Chat> {
    // Business logic + validation
    if (!data.title?.trim()) {
      throw new Error('Title is required');
    }

    // API call
    const chat = await chatApi.create(data);
    
    // Update local state
    this.#cache.set(chat.id, chat);
    
    // Emit event for UI updates
    chatBus.emit('chat:created', chat);
    
    return chat;
  }

  async streamMessage(chatId: string, message: string) {
    const stream = await chatApi.streamMessage(chatId, message);
    
    for await (const chunk of stream) {
      // Emit streaming events
      chatBus.emit('message:streaming', { chatId, content: chunk });
    }
  }

  getChats(): Chat[] {
    return Array.from(this.#cache.values());
  }

  getChatById(id: string): Chat | undefined {
    return this.#cache.get(id);
  }
}

export const chatService = new ChatService();
```

**Responsibilities:**
- Business logic & validation
- API calls & data fetching
- Local caching & state management
- Emit signal bus events after mutations
- **DON'T**: Render UI, handle component-specific state

---

### **Layer 4: Stores (Runes-based) - The Reactive State**
```typescript
// src/lib/stores/chatStore.svelte.ts
import { chatBus } from '$lib/signals/chatBus.svelte';

class ChatStore {
  #chats = $state<Chat[]>([]);
  #activeChat = $state<Chat | null>(null);
  #isLoading = $state(false);

  // Derived state
  get chats() {
    return this.#chats;
  }

  get activeChatMessages() {
    return this.#activeChat?.messages ?? [];
  }

  get unreadCount() {
    return this.#chats.filter(c => c.unread).length;
  }

  constructor() {
    // Listen to signal bus
    chatBus.on('chat:created', (chat) => {
      this.#chats = [...this.#chats, chat];
    });

    chatBus.on('chat:deleted', (id) => {
      this.#chats = this.#chats.filter(c => c.id !== id);
    });
  }

  setActiveChat(chat: Chat | null) {
    this.#activeChat = chat;
  }

  setLoading(loading: boolean) {
    this.#isLoading = loading;
  }
}

export const chatStore = new ChatStore();
```

**Responsibilities:**
- Reactive state management
- Derived state (computed values)
- Subscribe to signal bus for updates
- Provide clean API for components
- **DON'T**: Make API calls, contain complex business logic

---

### **Layer 5: Components - The UI Layer**
```svelte
<!-- src/lib/components/ChatMessage.svelte -->
<script lang="ts">
  import { Avatar, CodeBlock } from '@skeletonlabs/skeleton';
  import { marked } from 'marked';
  
  // Props for component configuration
  interface Props {
    message: Message;
    isStreaming?: boolean;
    onEdit?: (content: string) => void;
  }
  
  let { message, isStreaming = false, onEdit }: Props = $props();
  
  // Local component state (UI-specific)
  let isEditing = $state(false);
  let editContent = $state(message.content);
  
  // Derived state
  let formattedContent = $derived(marked.parse(message.content));
  
  function handleEdit() {
    if (onEdit) {
      onEdit(editContent);
    }
    isEditing = false;
  }
</script>

<div class="flex gap-4 p-4">
  <Avatar src={message.avatar} width="w-10" />
  
  <div class="flex-1">
    {#if isEditing}
      <textarea bind:value={editContent} />
      <button onclick={handleEdit}>Save</button>
    {:else}
      {@html formattedContent}
    {/if}
    
    {#if isStreaming}
      <div class="animate-pulse">▊</div>
    {/if}
  </div>
</div>
```

**Responsibilities:**
- Render UI based on props
- Handle local UI state (hover, focus, editing)
- Emit events via callbacks (props)
- Use Skeleton components for styling
- **DON'T**: Make API calls, contain business logic, access stores directly (unless global UI state)

---

## 2. **How Everything Integrates**

### **Data Flow Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION (button click, form submit)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ COMPONENT: Emits event via callback prop                     │
│   onclick={() => props.onCreateChat(data)}                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ROUTE/PAGE: Calls service                                    │
│   await chatService.createChat(data)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICE: Business logic + API call                           │
│   1. Validate data                                           │
│   2. Call API                                                │
│   3. Update cache                                            │
│   4. chatBus.emit('chat:created', chat) ◄──────┐            │
└────────────────────┬────────────────────────────┘            │
                     │                                          │
                     ▼                                          │
┌─────────────────────────────────────────────────────────────┤
│ SIGNAL BUS: Broadcasts event to all listeners                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ├──────┬──────┬──────┬
                     ▼      ▼      ▼      ▼
              ┌──────────┐ ┌───────────┐ ┌─────────┐
              │ Store    │ │ Component │ │ Route   │
              │ (updates)│ │ (refreshes│ │ (toasts)│
              └──────────┘ └───────────┘ └─────────┘
```

---

## 3. **Integration Examples**

### **Example 1: Creating a Chat with Full Flow**

```svelte
<!-- routes/+page.svelte -->
<script lang="ts">
  import { chatService } from '$lib/services/chatService';
  import { chatStore } from '$lib/stores/chatStore.svelte';
  import { chatBus } from '$lib/signals/chatBus.svelte';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import ChatList from '$lib/components/ChatList.svelte';
  import CreateChatModal from '$lib/components/CreateChatModal.svelte';
  
  const toastStore = getToastStore();
  
  let showModal = $state(false);
  
  // Listen for success events
  $effect(() => {
    const unsubscribe = chatBus.on('chat:created', (chat) => {
      toastStore.trigger({
        message: `Chat "${chat.title}" created!`,
        background: 'variant-filled-success'
      });
    });
    return unsubscribe;
  });
  
  async function handleCreateChat(data: CreateChatInput) {
    try {
      await chatService.createChat(data);
      showModal = false;
    } catch (error) {
      toastStore.trigger({
        message: error.message,
        background: 'variant-filled-error'
      });
    }
  }
</script>

<ChatList chats={chatStore.chats} />

<CreateChatModal 
  bind:open={showModal}
  onSubmit={handleCreateChat}
/>
```

### **Example 2: Streaming Messages**

```typescript
// service
class ChatService {
  async streamMessage(chatId: string, content: string) {
    let accumulatedContent = '';
    
    const stream = await chatApi.streamMessage(chatId, content);
    
    for await (const chunk of stream) {
      accumulatedContent += chunk;
      chatBus.emit('message:streaming', { 
        chatId, 
        content: accumulatedContent 
      });
    }
    
    chatBus.emit('message:complete', { chatId });
  }
}
```

```svelte
<!-- component -->
<script lang="ts">
  import { chatBus } from '$lib/signals/chatBus.svelte';
  
  let { chatId } = $props();
  let streamingContent = $state('');
  let isStreaming = $state(false);
  
  $effect(() => {
    const unsubscribe = chatBus.on('message:streaming', (data) => {
      if (data.chatId === chatId) {
        streamingContent = data.content;
        isStreaming = true;
      }
    });
    
    const unsubscribe2 = chatBus.on('message:complete', (data) => {
      if (data.chatId === chatId) {
        isStreaming = false;
      }
    });
    
    return () => {
      unsubscribe();
      unsubscribe2();
    };
  });
</script>

{#if isStreaming}
  <div>{streamingContent}<span class="animate-pulse">▊</span></div>
{/if}
```

---

## 4. **Best Practices Summary**

### ✅ **DO**
- **Routes**: Thin orchestration, load data, connect layers
- **Services**: Business logic, API calls, emit events
- **Stores**: Reactive state, derived values, subscribe to events
- **Components**: UI rendering, local state, emit callbacks
- **Signal Bus**: Decoupled communication, cross-component events

### ❌ **DON'T**
- Put business logic in components
- Make API calls from components
- Put UI logic in services
- Create tight coupling between components
- Forget to unsubscribe from signal bus in `$effect`

### 🎯 **Key Principles**
1. **Unidirectional data flow**: User → Component → Route → Service → Signal Bus → Store/Components
2. **Single responsibility**: Each layer has ONE job
3. **Dependency direction**: Components depend on stores/services, never the reverse
4. **Event-driven**: Use signal bus for cross-cutting concerns
5. **Type safety**: TypeScript everywhere with proper interfaces

