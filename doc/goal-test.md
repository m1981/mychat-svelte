To validate this "Multiverse" architecture, we must write integration tests that verify the database constraints, the hashing logic, and the graph traversal. 

Here is a comprehensive suite of TDD edge scenarios, formatted as **Given / When / Then**, to validate your schema before you write a single line of production code.

---

### Test Suite 1: The Hashing & Deduplication Engine
*Risk: If the hashing logic is flawed, the tree breaks, or we duplicate data unnecessarily.*

**Scenario 1.1: The Exact Duplicate (Idempotency Check)**
*   **Given:** A thread exists with Node A (Root) -> Node B.
*   **When:** The user navigates back to Node A and submits the *exact same prompt* with the *exact same run settings*.
*   **Then:** The generated SHA-256 hash must perfectly match Node B's ID. The database `INSERT` must gracefully handle the conflict (e.g., `ON CONFLICT DO NOTHING`). A new `Thread` is created, but its `headMessageId` points to the already existing Node B. No new message row is created.

**Scenario 1.2: The Settings Divergence**
*   **Given:** A thread exists with Node A -> Node B (Temperature: 0.7).
*   **When:** The user navigates to Node A, keeps the prompt identical, but changes the Temperature to 0.9.
*   **Then:** The generated hash must be different. A new Node C is inserted into the database with `parentId` = Node A. The new Thread points to Node C.

**Scenario 1.3: The Sequential Repetition (Self-Collision Check)**
*   **Given:** A user sends the message "Hello". (Node A).
*   **When:** The user sends the exact same message "Hello" again as the next turn. (Node B).
*   **Then:** Node B must have a completely unique hash from Node A. *(Validation: Because Node B's hash includes Node A's ID as its `parentId`, the hashes will naturally diverge. This proves the hash function correctly accounts for position in the tree).*

---

### Test Suite 2: Tree Traversal & Branching
*Risk: Pointers get lost, resulting in broken timelines or infinite loops.*

**Scenario 2.1: The Root Branching**
*   **Given:** A workspace exists with no messages.
*   **When:** The user creates two different starting prompts simultaneously (e.g., opening two tabs and sending different first messages).
*   **Then:** Both nodes are inserted with `parentId: null`. Two threads are created. Traversing either thread stops cleanly at the root without throwing null pointer exceptions.

**Scenario 2.2: The Deep Edit**
*   **Given:** A thread exists with Nodes A -> B -> C -> D -> E.
*   **When:** The user edits Node B, creating Node B2.
*   **Then:** A new Thread is created pointing to B2. Traversing the new thread yields exactly `[A, B2]`. Traversing the original thread still yields exactly `[A, B, C, D, E]`. Nodes C, D, and E remain completely unaffected.

**Scenario 2.3: The "Thought" Ordering**
*   **Given:** A user prompt (Node A) generates a Chain of Thought (Node B, `isThought: true`), which then generates the final answer (Node C, `isThought: false`).
*   **When:** The UI queries the thread pointing to Node C.
*   **Then:** The recursive CTE must return the nodes in the exact order: A, B, C. The frontend can reliably use the `isThought` flag to hide Node B in an accordion UI.

---

### Test Suite 3: Deletion & Cascade Integrity
*Risk: Deleting a node leaves dangling pointers, or deleting a thread wipes out shared history.*

**Scenario 3.1: Deleting a Branch (Thread)**
*   **Given:** Thread 1 points to Node C (Path: A -> B -> C). Thread 2 points to Node D (Path: A -> B -> D).
*   **When:** The user deletes Thread 2.
*   **Then:** The `threads` row for Thread 2 is deleted. **Crucially**, Nodes A and B must *not* be deleted, as Thread 1 still relies on them. *(Note: Node D becomes an "orphan". You will need a cron job or garbage collection logic to periodically delete messages that have no threads pointing to them or their children).*

**Scenario 3.2: The Mid-Tree Node Deletion (Cascade Check)**
*   **Given:** A thread exists with Nodes A -> B -> C -> D.
*   **When:** The user explicitly deletes Node B from the database.
*   **Then:** Because of the `onDelete('cascade')` on the `parentFk` foreign key, Nodes C and D must be automatically deleted by PostgreSQL. The `threads.headMessageId` pointing to Node D will be set to `NULL` (due to `onDelete: 'set null'` in the schema).

**Scenario 3.3: Workspace Nuke**
*   **Given:** A workspace (`chat`) with 5 threads, 50 messages, 10 artifacts, and 5 notes.
*   **When:** The user deletes the workspace.
*   **Then:** Every single associated thread, message, artifact, note, and highlight must be wiped from the database via foreign key cascades. Zero orphaned rows should remain.

---

### Test Suite 4: Knowledge Extraction (The Multiverse Superpowers)
*Risk: Notes and highlights appear in the wrong timelines, confusing the user.*

**Scenario 4.1: The Shared Highlight**
*   **Given:** Thread 1 (A -> B -> C) and Thread 2 (A -> B -> D).
*   **When:** The user highlights text in Node B while viewing Thread 1.
*   **Then:** When the user switches to Thread 2, the highlight must automatically render. Querying `highlights` by the nodes in Thread 2's path must return the highlight attached to Node B.

**Scenario 4.2: The Thread-Scoped Note**
*   **Given:** Thread 1 (A -> B -> C) and Thread 2 (A -> B -> D).
*   **When:** The user creates a Note attached specifically to `threadId` = Thread 2.
*   **Then:** Querying notes for Thread 1 must return 0 results. Querying notes for Thread 2 must return 1 result.

**Scenario 4.3: The Node-Scoped Note**
*   **Given:** Thread 1 (A -> B -> C) and Thread 2 (A -> B -> D).
*   **When:** The user creates a Note attached specifically to `messageId` = Node B.
*   **Then:** Querying notes for *both* Thread 1 and Thread 2 must return the note, because Node B exists in both traversal paths.

---

### Test Suite 5: Concurrency & Race Conditions
*Risk: Two rapid actions corrupt the tree state.*

**Scenario 5.1: Simultaneous Branching**
*   **Given:** A user is at Node A.
*   **When:** The user double-clicks "Regenerate Response" rapidly, firing two identical API requests simultaneously.
*   **Then:** 
    1. Both requests generate the exact same hash for the new Node B.
    2. The first request inserts Node B.
    3. The second request hits a Primary Key Unique Constraint violation.
    4. The backend catches the violation, realizes the node already exists, and simply creates a new Thread pointing to the existing Node B (or returns the first thread). The app does not crash.

**Scenario 5.2: Artifact Attachment Race**
*   **Given:** A user uploads a PDF and immediately hits "Send".
*   **When:** The message node is created *before* the artifact finishes uploading to S3.
*   **Then:** The `artifacts` table insert must safely resolve. Because `artifacts.messageId` is a foreign key, the artifact row can be inserted asynchronously *after* the message node is created without breaking the schema.

### Summary for the Developer
If your backend logic and Drizzle schema can pass these 14 scenarios, your data layer is bulletproof. You will have successfully built a commercial-grade, Git-like AI architecture that can handle infinite branching without data corruption.




### CRITICAL DISCOVERY 1: The Multimodal Hash Collision
*Risk: Silent data corruption and incorrect deduplication when using images/files.*

**Scenario 6.1: The "Empty Text + Different Image" Collision**
*   **Given:** A user is at Node A.
*   **When:** The user uploads `invoice_jan.pdf` with an empty text prompt (""). The system hashes `(parentId + role + "" + settings)` and creates Node B. 
*   **Then (The Bug):** The user goes back to Node A, uploads `invoice_feb.pdf` with an empty text prompt (""). The system hashes `(parentId + role + "" + settings)`. **The hash is identical to Node B.** The database deduplicates it. The user's second branch now points to the first invoice's response!
*   **The Architectural Fix:** The `messages.id` hash generation **MUST** include the checksums or IDs of any attached `artifacts`. 
    *   *New Hash Formula:* `SHA-256(parentId + role + content + runSettings + sorted_artifact_hashes)`.

---

### CRITICAL DISCOVERY 2: The "System Prompt" Mutation Paradox
*Risk: Breaking the immutable tree or confusing the user when global settings change.*

**Scenario 7.1: Changing the Rules Mid-Game**
*   **Given:** A workspace has a System Prompt (Node S1, `parentId: null`). The user has a 10-turn conversation (Nodes A through J) branching off S1.
*   **When:** The user opens the Workspace Settings and changes the System Prompt to "Act like a pirate" (Node S2). They then go to Node J and send a new message (Node K).
*   **Then (The Bug):** If Node K's `parentId` is Node J, it inherits the history of S1, *not* S2. The AI will not act like a pirate. If you try to update S1 directly, you violate the immutability of the tree and invalidate all hashes.
*   **The Architectural Fix:** System Prompts should not be standard nodes in the tree. They should be part of the `runSettings` JSONB object on *every single message node*. 
    *   *Why?* If a user changes the system prompt at Turn 10, the new message (Node K) will have a different `runSettings.systemPrompt`, generating a unique hash, correctly branching the timeline, and passing the correct system prompt to the LLM API.

---

### CRITICAL DISCOVERY 3: The "Dangling Head" (Thread Rewind Failure)
*Risk: Deleting a message breaks the UI because the Thread pointer points to nothing.*

**Scenario 8.1: Deleting the Active Leaf Node**
*   **Given:** Thread 1 points to Node C (Path: A -> B -> C).
*   **When:** The user clicks "Delete Message" on Node C.
*   **Then (The Bug):** Node C is deleted. Because of `onDelete('set null')` in the schema, `Thread 1.headMessageId` becomes `NULL`. The user's screen goes blank because the thread has lost its place in the timeline.
*   **The Architectural Fix (Application Logic):** Before executing the `DELETE` on Node C, the backend must check if any `threads.headMessageId === Node C.id`. If so, it must **rewind** the thread by updating `threads.headMessageId = Node C.parentId` (Node B). *Then* it can safely delete Node C.

---

### CRITICAL DISCOVERY 4: The "Dark Matter" Memory Leak (Garbage Collection)
*Risk: The database grows infinitely with orphaned nodes that no user can ever see or access.*

**Scenario 9.1: The Abandoned Timeline**
*   **Given:** A user experiments heavily, creating a path A -> B -> C -> D -> E. They realize it's garbage.
*   **When:** The user deletes the Thread pointing to Node E.
*   **Then (The Bug):** The `threads` row is gone. However, Nodes C, D, and E are still in the `messages` table. Because no thread points to them, and no thread points to their children, they are completely inaccessible via the UI. They are "Dark Matter."
*   **The Architectural Fix (Database Maintenance):** You cannot rely on standard foreign key cascades here because nodes point *up* to parents, not *down* to threads. You must implement a **Garbage Collection Cron Job**.
    *   *The Query:* Periodically run a query to find all `messages` that are NOT a `parentId` of any other message, AND are NOT a `headMessageId` in the `threads` table. Delete them. Repeat recursively until the tree is pruned of all dead branches.

---

### CRITICAL DISCOVERY 5: The Context Window Truncation
*Risk: Hash collisions when the LLM forgets early history.*

**Scenario 10.1: The 100k Token Limit**
*   **Given:** A thread reaches 200 messages. The total token count exceeds the LLM's context window.
*   **When:** The user sends message 201. The backend drops messages 1-50 from the API payload sent to OpenAI/Anthropic to fit the context window.
*   **Then:** The AI responds. The backend hashes the response and saves it. 
*   **The Edge Case:** Does dropping messages 1-50 change the hash of message 201? 
    *   *Validation:* No, because our hash only looks at `parentId` (Message 200). The tree structure remains perfectly intact. 
    *   *However:* If you want true scientific reproducibility (knowing *exactly* what context the AI saw to generate that response), you should add `context_start_node_id` to the `runSettings` JSONB. This proves that Node 201 was generated using only the context from Node 51 to 200.

### Summary of Schema/Logic Updates Required:
1.  **Hash Function:** Must include Artifact IDs.
2.  **System Prompts:** Move from `role: 'system'` rows into the `runSettings` JSONB.
3.  **Delete Logic:** Must "rewind" thread heads to `parentId` before deleting a leaf node.
4.  **Cron Job:** Must implement a Mark-and-Sweep garbage collector for orphaned nodes.