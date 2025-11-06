
Epic 1: Core Chat Interaction

This epic covers the fundamental user journey of starting, conducting, and viewing a conversation. It's the absolute MVP.

User Story 1.1: Starting a New Conversation

As a user, I want to start a new chat session so that I can ask a new, unrelated question.

Acceptance Criteria:

Given I am on the application's main page,

When I click the "New Chat" button (likely in the Menu component),

Then a new, empty chat session is created and displayed in the ChatHistoryList.

And the main ChatMessages area becomes blank, ready for my first prompt.

And the URL updates to reflect the new chatId (e.g., /chat/new-chat-id).

And the ChatStore is updated with the new chat, and currentChatIndex points to it.

User Story 1.2: Sending a Prompt and Receiving a Response

As a user, I want to type a message and receive a streamed response from the AI so that I can have a real-time conversation.

Acceptance Criteria:

Given I am in an active chat session,

When I type a prompt into the MessageComposer and press "Send",

Then my prompt immediately appears in the ChatMessages view.

And a placeholder for the AI's response appears, indicating that it is "thinking".

And the StreamingService initiates a request to the ChatGenerateEndpoint.

And the AI's response streams into the placeholder token by token.

And the MessageComposer is disabled or shows a "Stop Generating" button while the response is active.

And upon completion, the full response is saved to the ChatStore and persisted via the ChatService.

User Story 1.3: Viewing and Navigating Chat History

As a user, I want to see a list of my past conversations and switch between them so that I can easily reference previous discussions.

Acceptance Criteria:

Given I have multiple past conversations,

When I view the ChatHistoryList in the Menu,

Then I see a list of all my chats, likely titled with the first prompt of each chat.

When I click on a ChatHistory item,

Then the ChatPage loads the full message history for that selected chat.

And the URL updates to the corresponding chatId.

And the selected chat is visually highlighted in the ChatHistoryList.

Epic 2: Chat Management and Organization

This epic focuses on giving users tools to manage their growing list of conversations.

User Story 2.1: Renaming a Chat

As a user, I want to rename a chat's title so that I can give it a more meaningful name for future reference.

Acceptance Criteria:

Given I am viewing a chat in the ChatHistoryList,

When I click an "edit" icon next to the chat title,

Then the title becomes an editable input field.

When I change the name and press Enter or click away,

Then a PATCH request is sent to the ChatsEndpoint.

And the ChatStore is updated with the new title, which is reflected in the UI.

And a success Toast is displayed.

User Story 2.2: Deleting a Chat

As a user, I want to delete a chat I no longer need so that I can keep my history clean.

Acceptance Criteria:

Given I am viewing a chat in the ChatHistoryList,

When I click a "delete" icon next to the chat title,

Then a confirmation modal or prompt appears.

When I confirm the deletion,

Then a DELETE request is sent to the ChatsEndpoint.

And the chat is removed from the ChatStore and the ChatHistoryList.

And if I was viewing the deleted chat, I am redirected to a new chat or the next available chat.

User Story 2.3: Organizing Chats into Folders

As a user, I want to create folders and drag my chats into them so that I can group related conversations together.

Acceptance Criteria:

Given I am viewing my ChatHistoryList,

When I click a "New Folder" button,

Then a new, empty ChatFolder appears with an editable name.

When I name the folder, a POST request is sent to the FoldersEndpoint.

When I drag a ChatHistory item and drop it onto a ChatFolder,

Then a PATCH request is sent to the ChatsEndpoint to update the chat's folderId.

And the UI updates to show the chat nested within the folder.

And I can expand and collapse folders to show/hide the chats within them.

Epic 3: In-Chat Annotation and Knowledge Management

This is where your app becomes "Better" than the standard. It's about extracting value from conversations.

User Story 3.1: Taking Private Notes

As a user, I want to write and save private notes related to a specific chat so that I can summarize key takeaways or add my own thoughts.

Acceptance Criteria:

Given I am viewing a chat,

When I open the NotesPanel,

Then I see a text area to write my notes for the current chatId.

When I type in the notes area,

Then the content is auto-saved periodically (or via a save button) by making a POST or PATCH request to the NotesEndpoint.

And the NoteStore is updated.

When I return to this chat later, my saved notes are loaded into the NotesPanel.

User Story 3.2: Highlighting Key Messages

As a user, I want to highlight important parts of a message (both mine and the AI's) so that I can easily find critical information later.

Acceptance Criteria:

Given I am viewing a message in the ChatMessages component,

When I select a piece of text within a message,

Then a small tooltip or context menu appears with a "Highlight" option.

When I click "Highlight",

Then the selected text gets a distinct visual background color.

And a POST request is sent to the HighlightsEndpoint with the message ID and selected text range.

And the new highlight is added to the HighlightStore.

User Story 3.3: Viewing All Highlights for a Chat

As a user, I want to see a consolidated list of all my highlights for a given chat so that I can quickly review the most important points.

Acceptance Criteria:

Given I have highlighted several pieces of text in a chat,

When I open the HighlightsPanel,

Then I see a list of all my highlights for the current chatId.

And each item in the list shows the highlighted text and a reference to its original message.

When I click on a highlight in the panel,

Then the ChatMessages view scrolls to the original message containing that highlight.

Epic 4: Advanced Search and Discovery

This epic focuses on helping users find information across their entire chat history.

User Story 4.1: Searching Chat History

As a user, I want to search for a keyword or phrase within my chat history list so that I can quickly filter and find a specific conversation.

Acceptance Criteria:

Given I have many chats,

When I type a query into the search bar in the Menu component,

Then the ChatHistoryList is filtered in real-time to only show chats whose titles or content match the query.

And this filtering is handled client-side by the ChatStore for performance.

User Story 4.2: Performing a Global Content Search

As a user, I want to perform a deep search across the content of all my messages, notes, and highlights so that I can find specific information regardless of which chat it's in.

Acceptance Criteria:

Given I have a global search input,

When I enter a query and submit the search,

Then the SearchStore triggers a POST request to the SearchEndpoint.

And the UI displays a loading state while the SearchService processes the request.

Then the search results are displayed, showing snippets of matching messages, notes, or highlights.

And each search result links directly to the relevant chat and message.

Epic 5: Application Usability and Polish

This epic covers non-functional requirements and quality-of-life improvements that make the app feel professional.

User Story 5.1: Handling Application Errors Gracefully

As a developer, I want to ensure that if a component crashes or an API call fails, the user sees a helpful message instead of a broken page.

Acceptance Criteria:

Given an API call from ApiClient fails (e.g., server is down),

When the error is caught,

Then the ToastStore is used to display a user-friendly error message (e.g., "Failed to save chat. Please try again.").

Given a Svelte component encounters a runtime error,

When the error occurs,

Then the ErrorBoundary component catches it and displays a fallback UI, preventing the entire app from crashing.





## 1. Folder Management

### 1.1 Folder CRUD Operations
**Scenario: Create a new folder**
- **Given** user is authenticated
- **When** user clicks "New Folder" button
- **Then** a new folder should be created with default name "Untitled Folder"
- **And** folder should appear in sidebar
- **And** folder should be empty (0 chats)

**Scenario: Rename folder**
- **Given** a folder exists with name "Work"
- **When** user double-clicks folder name and enters "Personal Projects"
- **Then** folder name should update to "Personal Projects"
- **And** change should persist after page reload

**Scenario: Archive folder with chats**
- **Given** a folder "Work" contains 3 chats
- **When** user archive the folder
- **Then** folder and all contained chats should be archived
- **And** chats should be moved to "Archived" section

---

## 2. Notes Management

### 2.1 Create
**Scenario: Create note for a chat**
- **Given** user is viewing "Chat1"
- **When** user clicks "Add Note" in Notes panel
- **Then** note editor should open
- **When** user enters "Important API endpoint discussion"
- **And** user saves note
- **Then** note should appear in Notes panel for this chat
- **And** note should have timestamp

### 2.2 Note Organization
**Scenario: Link note to specific message**
- **Given** user is viewing chat with 10 messages
- **When** user creates note from message context menu
- **Then** note should be linked to that specific message
- **When** user clicks note in sidebar
- **Then** chat should scroll to linked message
- **And** message should be highlighted temporarily

**Scenario: Standalone chat-level notes**
- **Given** user is viewing "Chat1"
- **When** user creates general note not linked to message
- **Then** note should be associated with entire chat
- **And** note should appear in Notes panel without message reference

---

## 3. Highlights Management

### 3.1 Creating Highlights
**Scenario: Highlight text in message**
- **Given** user is viewing chat message "The API key should be stored in environment variables"
- **When** user selects text "API key should be stored in environment variables"
- **And** user clicks "Highlight" from context menu
- **Then** text should be visually highlighted (yellow background)
- **And** highlight should appear in Highlights panel

### 3.2 Managing Highlights
**Scenario: Navigate to highlight from panel**
- **Given** chat has 5 highlights across different messages
- **When** user clicks highlight in Highlights panel
- **Then** chat should scroll to highlighted text
- **And** highlight should pulse/flash for visibility

---

## 5. Search Functionality

### 5.1 Basic Text Search
**Scenario: Search across all chats**
- **Given** user has 300 chats
- **When** user enters "API authentication" in search
- **Then** results should show all chats containing these terms
- **And** matching text should be highlighted in results
- **And** results should show chat name, folder, and snippet

**Scenario: Search within specific folder**
- **Given** user is viewing "Work" folder with 50 chats
- **When** user searches "deadline" with "Current Folder" filter
- **Then** only chats in "Work" folder should be searched
- **And** results should be scoped to that folder


### 5.3 Semantic Search
**Scenario: Semantic search finds related content**
- **Given** semantic search is enabled
- **When** user searches "how to secure passwords"
- **Then** results should include exact matches AND semantically similar content
- **Like** "password hashing", "bcrypt", "authentication security"
- **And** semantic results should be marked with confidence score

**Scenario: Semantic search with embeddings API**
- **Given** search query "machine learning deployment"
- **When** system calls embeddings API endpoint
- **Then** API should return vector representation
- **And** system should find chats with similar embeddings
- **And** results should be ranked by cosine similarity
- **And** minimum similarity threshold should be 0.7

**Scenario: Hybrid search (text + semantic)**
- **Given** user searches "React performance optimization"
- **When** search executes
- **Then** system should combine:
  - Exact text matches (highest priority)
  - Tag matches
  - Semantic/embedding matches
- **And** results should be merged and ranked
- **And** user can toggle between ranking algorithms

## 6. File Attachments

### 6.1 Attaching Files
**Scenario: Upload file to chat**
- **Given** user is in chat
- **When** user clicks "Attach File" and selects "document.pdf"
- **Then** file should upload with progress indicator
- **And** file should appear in Files panel
- **And** file should be linked to current chat

**Scenario: Attach multiple files**
- **Given** user selects 3 files (doc.pdf, image.png, data.csv)
- **When** user uploads them
- **Then** all files should appear in Files panel
- **And** each should show file type icon and size

**Scenario: File size validation**
- **Given** maximum file size is 25MB
- **When** user tries to upload 30MB file
- **Then** system should show error "File exceeds 25MB limit"
- **And** upload should be rejected

**Scenario: Delete file attachment**
- **Given** chat has file "old_document.pdf"
- **When** user deletes file
- **Then** file should be removed from Files panel
- **And** file should be marked for deletion from storage
- **But** chat history should show "File removed" message


## 8. Reference System (Context Injection)

### 8.1 Referencing Chats
**Scenario: Reference single chat in prompt**
- **Given** user is composing new message
- **When** user types "@" or uses reference button
- **Then** dropdown should show recent chats
- **When** user selects "Chat1"
- **Then** reference chip [@Chat1] should appear in input
- **And** chat context should be included in API request

**Scenario: Reference multiple chats**
- **Given** user wants context from multiple chats
- **When** user adds [@Chat1] [@Chat2] [@Chat3] to prompt
- **Then** all three chat contexts should be combined
- **And** token limit warning should show if exceeding limit

**Scenario: Preview referenced content**
- **Given** user has added [@ProjectDiscussion]
- **When** user hovers over reference chip
- **Then** tooltip should show chat preview (title, date, snippet)
- **And** click should open chat in modal/side panel

### 8.2 Referencing Folders
**Scenario: Reference entire folder**
- **Given** folder "Work" contains 15 chats
- **When** user references [📁Work] in prompt
- **Then** system should ask: "Include all 15 chats or select specific?"
- **When** user selects "All chats"
- **Then** context from all chats should be aggregated
- **And** system should use intelligent summarization if too large

**Scenario: Selective folder referencing**
- **Given** user references folder [📁Projects]
- **When** user chooses "Select chats"
- **Then** checklist of folder chats should appear
- **When** user selects 3 specific chats
- **Then** only those chats should be included in context

**Scenario: Token limit handling**
- **Given** referenced content exceeds model token limit
- **When** user attempts to send prompt
- **Then** system should show warning with options:
  - "Summarize and send"
  - "Select fewer references"
  - "Send with truncation"
- **When** user chooses "Summarize"
- **Then** AI should create summary within token limits

### 8.3 Reference Management
**Scenario: Remove reference from prompt**
- **Given** prompt contains [@Chat1] [@Chat2]
- **When** user clicks 'x' on [@Chat1] chip
- **Then** reference should be removed
- **And** context should update accordingly

**Scenario: Reference autocomplete**
- **Given** user types "@proj" in prompt
- **Then** system should suggest matching chats/folders:
  - "Project Alpha"
  - "Project Beta"  
  - 📁 Projects folder
- **When** user selects suggestion
- **Then** reference should be added

**Scenario: Reference in response**
- **Given** user asked question with [@Chat1] reference
- **When** AI responds
- **Then** response should acknowledge which contexts were used
- **And** citations should link back to referenced chats

---

## 9. Sidebar UI/UX

### 9.1 Panel Switching
**Scenario: Switch between sidebar panels**
- **Given** user is viewing Highlights panel
- **When** user clicks "Notes" tab
- **Then** panel should switch to Notes view
- **And** previous panel state should be preserved

**Scenario: Collapse/expand sidebar**
- **Given** sidebar is expanded
- **When** user clicks collapse button
- **Then** sidebar should animate to collapsed state
- **And** only icons should be visible
- **When** user hovers over icon
- **Then** tooltip should show panel name

**Scenario: Resize sidebar panel**
- **Given** user wants larger panel view
- **When** user drags panel border
- **Then** panel should resize smoothly
- **And** size preference should persist

### 9.2 Secondary Panel (JetBrains-style)
**Scenario: Toggle secondary panel**
- **Given** secondary panel is hidden
- **When** user clicks "Highlights" button
- **Then** panel should slide in from right
- **And** main chat area should adjust width

**Scenario: Pin panel open**
- **Given** secondary panel is open
- **When** user clicks pin icon
- **Then** panel should remain open across chat navigation
- **When** unpinned
- **Then** panel should auto-hide when clicking outside

**Scenario: Multiple secondary panels**
- **Given** user opens Notes panel
- **When** user clicks Highlights (while Notes open)
- **Then** panels should stack or tab based on UI mode
- **And** user can switch between them

---

## 10. Integration Tests

### 10.1 Cross-Feature Workflows
**Scenario: Complete content management workflow**
1. Create folder "Client Project"
2. Create chat "Requirements Discussion"
4. Highlight important sections
6. Attach requirements.pdf
7. Search for specific requirement using semantic search
8. Reference this chat in new chat about implementation
9. Verify all data persists after page reload



### 10.3 Data Persistence
**Scenario: Offline functionality**
- **Given** user loses internet connection
- **When** user creates notes and highlights
- **Then** changes should save locally
- **When** connection restored
- **Then** changes should sync to server
- **And** conflicts should be resolved appropriately

---

## 11. API/Backend Tests

### 11.1 Embeddings API
**Scenario: Generate embeddings for new chat**
- **Given** user creates chat with message
- **When** chat is saved
- **Then** POST request to embeddings API should fire
- **And** embeddings should be stored in vector database
- **And** chat should be searchable via semantic search

**Scenario: Update embeddings on edit**
- **Given** chat has existing embeddings
- **When** user edits message content
- **Then** embeddings should be regenerated
- **And** search index should update

**Scenario: Batch embedding generation**
- **Given** user imports 50 chats
- **When** import completes
- **Then** embeddings should be generated in batches
- **And** progress should be shown to user
- **And** search should work after all embeddings complete

### 11.2 Search API Performance
**Scenario: Fast search response**
- **Given** user searches "authentication methods"
- **When** search query executes
- **Then** text search should return within 100ms
- **And** semantic search should return within 500ms
- **And** results should stream as they arrive

---

## 12. Error Handling & Edge Cases

**Scenario: Handle network failure during file upload**
- **Given** user is uploading 10MB file
- **When** network disconnects at 50% upload
- **Then** system should pause upload
- **When** network reconnects
- **Then** upload should resume from 50%

**Scenario: Graceful degradation without embeddings**
- **Given** embeddings API is down
- **When** user performs search
- **Then** text and tag search should still work
- **And** user should see notice "Semantic search temporarily unavailable"

**Scenario: Handle corrupted highlights**
- **Given** highlight data becomes corrupted
- **When** user opens chat
- **Then** system should gracefully skip corrupted highlight
- **And** log error for debugging
- **And** show recovery option to user

