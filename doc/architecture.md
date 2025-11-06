Act as commercial grade SvelteKit v5 developer and TypesScript expert.


Here are propose changes and details are in api_contracts.md
Please carry one implementation step by step along with minimalistic UTs (Vitest) to prove implementation works.

📊 Update Domain Model
```mermaid

classDiagram
    %% ============================================
    %% CORE DOMAIN ENTITIES
    %% ============================================
    class Chat {
        +string id
        +string title
        +string? folderId
        +Message[] messages
        +ChatConfig config
        +string[] tags
        +Metadata metadata
        +createdAt timestamp
        +updatedAt timestamp
    }

    class Folder {
        +string id
        +string name
        +string? parentId
        +boolean expanded
        +number order
        +string? color
        +string[] tags
        +FolderType type
    }

    class Message {
        +string id
        +string chatId
        +string role
        +string content
        +string[] tags
        +Highlight[] highlights
        +timestamp createdAt
    }

    class Note {
        +string id
        +string chatId
        +string? messageId
        +string content
        +string[] tags
        +NoteType type
        +timestamp createdAt
        +timestamp updatedAt
    }

    class Highlight {
        +string id
        +string messageId
        +string text
        +number startOffset
        +number endOffset
        +string? color
        +string? note
        +timestamp createdAt
    }

    class Attachment {
        +string id
        +string chatId
        +AttachmentType type
        +string content
        +Metadata metadata
        +timestamp createdAt
    }

    class Tag {
        +string id
        +string name
        +string? color
        +TagType type
    }

    class Reference {
        +string id
        +ReferenceType type
        +string targetId
        +string context
    }

    %% ============================================
    %% ENUMS & VALUE OBJECTS
    %% ============================================
    class FolderType {
        <<enumeration>>
        STANDARD
        ARCHIVE
        FAVORITE
    }

    class AttachmentType {
        <<enumeration>>
        FILE
        URL
        IMAGE
    }

    class NoteType {
        <<enumeration>>
        SCRATCH
        SUMMARY
        TODO
    }

    class TagType {
        <<enumeration>>
        CHAT
        MESSAGE
        NOTE
    }

    class ReferenceType {
        <<enumeration>>
        CHAT
        FOLDER
        MESSAGE
    }

    class Metadata {
        +number tokenCount
        +string? embedding
        +Record~string, any~ custom
    }

    %% ============================================
    %% RELATIONSHIPS
    %% ============================================
    Folder "1" --> "*" Chat : contains
    Folder "1" --> "*" Folder : contains
    Chat "1" --> "*" Message : contains
    Chat "1" --> "*" Note : has
    Chat "1" --> "*" Attachment : has
    Chat "*" --> "*" Tag : tagged with
    Message "1" --> "*" Highlight : contains
    Message "*" --> "*" Tag : tagged with
    Note "*" --> "*" Tag : tagged with
    Reference --> Chat : references
    Reference --> Folder : references
    Reference --> Message : references
```

🏗️ Architecture Layers

```mermaid
graph TB
    subgraph "PRESENTATION - Svelte Components"
        A1[ChatView]
        A2[Sidebar<br/>- Highlights<br/>- Notes<br/>- Attachments]
        A3[FolderTree]
        A4[MessageComposer<br/>with References]
        A5[SearchPanel]
    end

    subgraph "STATE MANAGEMENT - Stores"
        B1[chat.store]
        B2[folder.store]
        B3[note.store]
        B4[highlight.store]
        B5[attachment.store]
        B6[tag.store]
        B7[reference.store]
        B8[search.store]
    end

    subgraph "API CLIENT"
        C1[api/chats]
        C2[api/notes]
        C3[api/highlights]
        C4[api/attachments]
        C5[api/search]
        C6[api/embeddings]
    end

    subgraph "SERVER ROUTES"
        D1["#47;api#47;chats"]
        D2["#47;api#47;notes"]
        D3["#47;api#47;highlights"]
        D4["#47;api#47;attachments"]
        D5["#47;api#47;search"]
        D6["#47;api#47;embeddings"]
    end

    subgraph "SERVICES - Business Logic"
        E1[ChatService]
        E2[NoteService]
        E3[HighlightService]
        E4[AttachmentService]
        E5[SearchService]
        E6[EmbeddingService]
    end

    subgraph "REPOSITORIES - Data Access"
        F1[ChatRepository]
        F2[NoteRepository]
        F3[HighlightRepository]
        F4[AttachmentRepository]
        F5[TagRepository]
    end

    subgraph "DATABASE"
        G1[(PostgreSQL)]
        G2[(pgvector<br/>Embeddings)]
    end

    subgraph "EXTERNAL"
        H1[OpenAI<br/>Embeddings API]
    end

    A1 --> B1
    A2 --> B3
    A2 --> B4
    A2 --> B5
    A3 --> B2
    A4 --> B7
    A5 --> B8

    B1 --> C1
    B3 --> C2
    B4 --> C3
    B5 --> C4
    B8 --> C5

    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D4
    C5 --> D5
    C6 --> D6

    D1 --> E1
    D2 --> E2
    D3 --> E3
    D4 --> E4
    D5 --> E5

    E1 --> F1
    E2 --> F2
    E3 --> F3
    E4 --> F4
    E5 --> F1
    E5 --> F2
    E6 --> F1

    F1 --> G1
    F2 --> G1
    F3 --> G1
    F4 --> G1
    F5 --> G1

    E6 --> H1
    E6 --> G2
```
