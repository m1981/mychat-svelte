## Diagram 1: App Initialization Flow
```mermaid
sequenceDiagram
    participant Browser
    participant Layout as +layout.svelte
    participant Store as chat.store.ts
    participant Sync as sync.service.ts
    participant IDB as IndexedDB
    participant API as Server API

    Browser->>Layout: Page loads
    Layout->>Layout: onMount()
    Layout->>Store: initializeStores()
    
    Store->>Sync: syncService.init()
    Sync->>IDB: Initialize IndexedDB
    IDB-->>Sync: ✅ Ready
    
    Sync->>Sync: Start periodic sync (30s)
    Sync->>API: GET /api/sync/chats
    API-->>Sync: [] (no chats)
    Sync->>API: GET /api/sync/folders
    API-->>Sync: [] (no folders)
    Sync-->>Store: ✅ Sync complete
    
    Store->>IDB: loadFromLocal()
    IDB-->>Store: [] (empty chats/folders)
    Store->>Store: isLoaded.set(true)
    Store-->>Layout: ✅ Initialized
    
    Layout->>Browser: Render app UI
```

## Diagram 2: Create Chat Flow (Local-First with Sync)

```mermaid
sequenceDiagram
    participant User
    participant Page as +page.svelte
    participant Store as chat.store.ts
    participant IDB as IndexedDB
    participant Sync as sync.service.ts
    participant Queue as Sync Queue
    participant API as POST /api/chats
    participant DB as PostgreSQL

    User->>Page: Click "Start Your First Chat"
    Page->>Store: createChat({ title: 'New Chat' })
    
    Note over Store: Generate chat ID<br/>chat-{timestamp}-{random}
    
    Store->>Store: Build newChat object<br/>(with userId: 1 locally)
    Store->>IDB: saveChat(newChat)
    IDB-->>Store: ✅ Saved
    
    Store->>Store: Update reactive store<br/>chats = [newChat, ...current]
    Store->>Page: ✅ Chat created locally
    
    Note over Store: Remove userId from sync payload
    Store->>Store: { userId, ...chatDataForServer } = newChat
    
    Store->>Sync: queueOperation('CREATE', 'CHAT', id, chatDataForServer)
    Sync->>Queue: Add to sync queue
    Queue-->>Sync: ✅ Queued
    
    Note over Sync: Sync immediately (online)
    Sync->>Queue: Get pending operations
    Queue-->>Sync: [CREATE CHAT operation]
    
    Sync->>API: POST /api/chats<br/>(without userId)
    Note over API: Server adds userId from session
    API->>DB: INSERT INTO chats<br/>(userId: 1, title, config...)
    DB-->>API: ✅ Created
    API-->>Sync: { id, userId, title, ... }
    
    Sync->>Queue: Remove from sync queue
    Sync->>API: GET /api/sync/chats<br/>(pull server changes)
    API-->>Sync: [serverChat]
    Sync->>IDB: saveChat(serverChat)<br/>(with server-generated data)
    IDB-->>Sync: ✅ Saved
    
    Note over Store,IDB: Next load will use<br/>server version from IDB
    
    Page->>User: Navigate to chat page
```

## Diagram 3: Offline Chat Creation (Queue & Retry)
```mermaid
sequenceDiagram
    participant User
    participant Store as chat.store.ts
    participant IDB as IndexedDB
    participant Sync as sync.service.ts
    participant Queue as Sync Queue
    participant Network
    participant API as Server API

    Note over Network: User goes offline
    Network->>Sync: navigator.onLine = false
    
    User->>Store: createChat()
    Store->>IDB: saveChat()
    IDB-->>Store: ✅ Saved locally
    
    Store->>Sync: queueOperation()
    Sync->>Queue: Add to queue
    Note over Sync: Skip sync (offline)
    Queue-->>Store: ✅ Queued for later
    
    Store->>User: ✅ Chat created<br/>(works offline!)
    
    Note over Network: Later: User comes back online
    Network->>Sync: navigator.onLine = true
    Sync->>Sync: handleOnline()<br/>trigger sync()
    
    Sync->>Queue: Get pending operations
    Queue-->>Sync: [CREATE CHAT operation]
    
    Sync->>API: POST /api/chats
    API-->>Sync: ✅ Created on server
    
    Sync->>Queue: Remove from queue
    Sync->>API: Pull server changes
    API-->>Sync: [serverChat with real IDs]
    
    Sync->>IDB: Update with server version
    IDB-->>Sync: ✅ Updated
    
    Note over Sync,IDB: Local temp ID replaced<br/>with server ID
```


## Diagram 4: Data Binding & Reactivity Flow
```mermaid

sequenceDiagram
    participant User
    participant Component as ChatHistoryList.svelte
    participant Store as chats (writable store)
    participant Derived as $chats (reactive)
    participant DOM as Browser DOM

    Note over Store: Initial state: chats = []
    
    Store->>Derived: Subscribe
    Derived->>Component: $chats = []
    Component->>DOM: Render empty state
    
    User->>Store: createChat() triggers<br/>chats.update()
    
    Note over Store: chats = [newChat]
    
    Store->>Derived: Notify subscribers
    Derived->>Component: $chats = [newChat]
    
    Note over Component: Svelte detects change
    Component->>Component: Re-run derived logic<br/>allChats = $derived($chats)
    
    Component->>DOM: Update DOM<br/>(add chat to list)
    
    DOM->>User: See new chat appear<br/>(instant feedback!)
    
    Note over Store,DOM: All automatic via<br/>Svelte reactivity
```

## Diagram 5: Sync Conflict Resolution (Future State)
```mermaid
sequenceDiagram
    participant Device1 as Device 1 (Offline)
    participant Device2 as Device 2 (Offline)
    participant IDB1 as IndexedDB 1
    participant IDB2 as IndexedDB 2
    participant Server as Server DB
    
    Note over Device1,Device2: Both devices offline
    
    Device1->>IDB1: Update chat title = "Draft A"
    Device2->>IDB2: Update chat title = "Draft B"
    
    Note over Device1,Device2: Both come online
    
    Device1->>Server: PATCH /api/chats/123<br/>{ title: "Draft A" }
    Server->>Server: updatedAt = T1
    
    Device2->>Server: PATCH /api/chats/123<br/>{ title: "Draft B" }
    Note over Server: Conflict detected!<br/>updatedAt T2 > T1
    Server->>Server: Last write wins<br/>(or custom logic)
    
    Server-->>Device1: Pull: title = "Draft B"
    Server-->>Device2: Pull: title = "Draft B"
    
    Device1->>IDB1: Update with server version
    Device2->>IDB2: Keep current version
    
    Note over Device1,Device2: Both synced to "Draft B"
```