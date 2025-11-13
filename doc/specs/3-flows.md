## Diagram 1: App Initialization Flow
```mermaid
sequenceDiagram
    participant Browser
    participant Layout as +layout.svelte
    participant Store as chat.store.ts
    participant Sync as sync.service.ts
    participant IDB as local-db.ts
    participant API as Server API

    Browser->>Layout: Page loads
    Layout->>Layout: onMount()
    Layout->>Store: initializeStores()
    
    Store->>Sync: syncService.init()
    Sync->>IDB: localDB.init()
    IDB-->>Sync: ✅ DB Ready
    
    Note over Store: Reads from local DB first for instant load
    Store->>IDB: loadFromLocal() (getAllChats, getAllFolders)
    IDB-->>Store: [local chats], {local folders}
    Store->>Store: chats.set(...), folders.set(...)
    Store->>Store: isLoaded.set(true)
    Store-->>Layout: ✅ Initialized with local data
    
    Layout->>Browser: Render UI immediately
    
    Note over Sync: Sync runs in background
    Sync->>Sync: Start periodic sync (30s)
    Sync->>API: POST /api/sync/chats (pulls delta)
    API-->>Sync: [server changes]
    Sync->>IDB: saveChat(change)
    
    Note over IDB, Store: Future loads/refreshes will use synced data
```

## Diagram 2: Create Chat Flow (Local-First with Sync)

```mermaid
sequenceDiagram
    participant User
    participant Component as NewChat.svelte
    participant Store as chat.store.ts
    participant IDB as local-db.ts
    participant Sync as sync.service.ts
    participant Queue as Sync Queue (in IDB)
    participant API as POST /api/chats
    participant DB as PostgreSQL

    User->>Component: Click "New Chat"
    Component->>Store: createChat({ title: 'New Chat' })
    
    Note over Store: Generates local ID: chat-{timestamp}-{random}
    Store->>Store: Builds newChat object (with local userId)
    
    Store->>IDB: localDB.saveChat(newChat)
    IDB-->>Store: ✅ Saved Locally
    
    Store->>Store: chats.update(...) -> UI reacts instantly
    Store-->>Component: ✅ Chat appears in UI
    
    Note over Store: Prepares payload for server, removing userId
    Store->>Store: { userId, ...chatDataForServer } = newChat
    
    Store->>Sync: syncService.queueOperation('CREATE', 'CHAT', id, chatDataForServer)
    Sync->>Queue: localDB.addToSyncQueue(...)
    Queue-->>Sync: ✅ Queued
    
    Note over Sync: Sync triggers immediately (if online)
    Sync->>Queue: Get pending operations
    Queue-->>Sync: [CREATE CHAT operation]
    
    Sync->>API: POST /api/chats (payload WITHOUT userId)
    Note over API: Server adds userId from session
    API->>DB: INSERT INTO chats (userId, title, ...)
    DB-->>API: ✅ Created
    API-->>Sync: { server-generated chat data }
    
    Sync->>Queue: Remove operation from queue
    
    Note over Sync, IDB: A subsequent pull sync will update the local record
    Sync->>API: POST /api/sync/chats (pulls delta)
    API-->>Sync: [serverChat]
    Sync->>IDB: saveChat(serverChat)
    IDB-->>Sync: ✅ Updated in IDB
```

## Diagram 3: Offline Chat Creation (Queue & Retry)
```mermaid
sequenceDiagram
    participant User
    participant Store as chat.store.ts
    participant IDB as local-db.ts
    participant Sync as sync.service.ts
    participant Queue as Sync Queue (in IDB)
    participant Network
    participant API as Server API

    Note over Network: User goes offline
    Network->>Sync: navigator.onLine = false
    
    User->>Store: createChat()
    Store->>IDB: localDB.saveChat()
    IDB-->>Store: ✅ Saved locally
    
    Store->>Sync: syncService.queueOperation()
    Sync->>Queue: Add to queue
    Note over Sync: Skips sync process (offline)
    Queue-->>Store: ✅ Queued for later
    
    Store->>User: ✅ Chat created (works offline!)
    
    Note over Network: Later: User comes back online
    Network->>Sync: navigator.onLine = true
    Sync->>Sync: handleOnline() triggers sync()
    
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
    participant Store as chat.store.ts (chats)
    participant DerivedState as const allChats = $derived(...)
    participant DOM as Browser DOM

    Note over Store: Initial state: chats.set([])
    
    Store->>DerivedState: State change notifies derived computations
    DerivedState->>Component: allChats is re-evaluated to []
    Component->>DOM: Render empty state
    
    User->>Store: createChat() calls chats.update(...)
    
    Note over Store: chats store now holds [newChat]
    
    Store->>DerivedState: Notifies derived computations of the change
    DerivedState->>Component: allChats is re-evaluated to [newChat]
    
    Note over Component: Svelte 5 runtime detects the change in allChats
    Component->>DOM: Efficiently updates the DOM to add the new chat
    
    DOM->>User: See new chat appear instantly
```

## Diagram 5: Sync Conflict Resolution (Future State)
```mermaid
sequenceDiagram
    participant Device1 as Device 1 (Offline)
    participant Device2 as Device 2 (Online)
    participant IDB1 as IndexedDB 1
    participant Server as Server DB
    
    Note over Device1: Device 1 goes offline
    Device1->>IDB1: Update chat title = "Draft A"
    Device1->>IDB1: Queue UPDATE operation
    
    Note over Device2: Device 2 is online and makes a change
    Device2->>Server: PATCH /api/chats/123<br/>{ title: "Draft B" }
    Server->>Server: updatedAt = T1
    Server-->>Device2: ✅ Update successful
    
    Note over Device1: Device 1 comes back online
    Device1->>Server: (Sync pushes queued op)<br/>PATCH /api/chats/123<br/>{ title: "Draft A" }
    
    Note over Server: Implicit "Last Write Wins" strategy
    Server->>Server: updatedAt = T2 (> T1)
    Server-->>Device1: ✅ Update successful
    
    Note over Device1, Device2: Both devices will eventually sync to "Draft A"
    Device2->>Server: (On next pull sync)
    Server-->>Device2: Pull: title = "Draft A"
    Device2->>IDB1: Update with server version
    
    Note over Device1,Device2: Both devices are now synced to "Draft A"
```