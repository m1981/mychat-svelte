# API Documentation

## Overview

This document describes the REST API endpoints for the ChatGPT-like application. All endpoints support both OpenAI and Anthropic Claude models with streaming responses.

## Base URL

```
http://localhost:5173/api  (development)
```

---

## Authentication

Currently, the API does not require authentication. In production, you should implement proper authentication and authorization.

---

## Endpoints

### Chat Management

#### 1. Get All Chats

Retrieve all chats with their messages.

**Endpoint:** `GET /api/chat`

**Query Parameters:**
- `userId` (optional): Filter chats by user ID

**Response:**
```json
[
  {
    "id": "1",
    "title": "My First Chat",
    "folder": "2",
    "messages": [
      {
        "role": "user",
        "content": "Hello!"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help you today?"
      }
    ],
    "config": {
      "provider": "anthropic",
      "modelConfig": {
        "model": "claude-3-7-sonnet-20250219",
        "max_tokens": 4096,
        "temperature": 0.7,
        "top_p": 1,
        "presence_penalty": 0,
        "frequency_penalty": 0
      }
    }
  }
]
```

**Example:**
```bash
curl http://localhost:5173/api/chat
```

---

#### 2. Create New Chat

Create a new chat conversation.

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "title": "New Chat About AI",
  "provider": "anthropic",
  "modelConfig": {
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 4096,
    "temperature": 0.7,
    "top_p": 1,
    "presence_penalty": 0,
    "frequency_penalty": 0
  },
  "folderId": "2",
  "userId": "1"
}
```

**Response:**
```json
{
  "id": "5",
  "title": "New Chat About AI",
  "folder": "2",
  "messages": [],
  "config": {
    "provider": "anthropic",
    "modelConfig": {
      "model": "claude-3-7-sonnet-20250219",
      "max_tokens": 4096,
      "temperature": 0.7,
      "top_p": 1,
      "presence_penalty": 0,
      "frequency_penalty": 0
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Chat",
    "provider": "openai",
    "modelConfig": {
      "model": "gpt-4-turbo",
      "max_tokens": 4096,
      "temperature": 0.7,
      "top_p": 1,
      "presence_penalty": 0,
      "frequency_penalty": 0
    }
  }'
```

---

#### 3. Get Single Chat

Retrieve a specific chat by ID.

**Endpoint:** `GET /api/chat/[id]`

**Response:** Same as individual chat object in "Get All Chats"

**Example:**
```bash
curl http://localhost:5173/api/chat/1
```

---

#### 4. Update Chat

Update a chat's title or folder.

**Endpoint:** `PATCH /api/chat/[id]`

**Request Body:**
```json
{
  "title": "Updated Chat Title",
  "folderId": "3"
}
```

**Response:** Updated chat object

**Example:**
```bash
curl -X PATCH http://localhost:5173/api/chat/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "My Updated Chat"}'
```

---

#### 5. Delete Chat

Delete a chat and all its messages.

**Endpoint:** `DELETE /api/chat/[id]`

**Response:**
```json
{
  "success": true,
  "id": "1"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:5173/api/chat/1
```

---

### Messages

#### 6. Send Message (Streaming)

Send a message and receive a streaming response from the LLM.

**Endpoint:** `POST /api/messages`

**Request Body:**
```json
{
  "chatId": "1",
  "content": "What is the capital of France?",
  "role": "user"
}
```

**Response:** Server-Sent Events (SSE) stream

**Stream Format:**
```
data: {"chunk":"The"}

data: {"chunk":" capital"}

data: {"chunk":" of"}

data: {"chunk":" France"}

data: {"chunk":" is"}

data: {"chunk":" Paris"}

data: {"done":true,"userMessageId":123,"assistantMessageId":124,"fullResponse":"The capital of France is Paris."}
```

**Example (with EventSource in browser):**
```javascript
const response = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatId: '1',
    content: 'What is the capital of France?'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.chunk) {
        // Append chunk to UI
        console.log('Chunk:', data.chunk);
      } else if (data.done) {
        // Streaming complete
        console.log('Full response:', data.fullResponse);
      } else if (data.error) {
        // Handle error
        console.error('Error:', data.error);
      }
    }
  }
}
```

---

#### 7. Get Messages

Retrieve all messages for a specific chat.

**Endpoint:** `GET /api/messages?chatId=1`

**Query Parameters:**
- `chatId` (required): The chat ID

**Response:**
```json
[
  {
    "id": 1,
    "role": "user",
    "content": "Hello!",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "role": "assistant",
    "content": "Hi! How can I help you?",
    "createdAt": "2025-01-15T10:30:05Z"
  }
]
```

**Example:**
```bash
curl http://localhost:5173/api/messages?chatId=1
```

---

## Supported Models

### OpenAI Models
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`
- And other OpenAI models

### Anthropic Claude Models
- `claude-3-7-sonnet-20250219` (latest)
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

---

## Model Configuration

Each chat has a `modelConfig` object that controls the LLM behavior:

```typescript
{
  model: string;              // Model name
  max_tokens: number;         // Maximum tokens in response (default: 4096)
  temperature: number;        // Randomness 0-2 (default: 0.7)
  top_p: number;             // Nucleus sampling 0-1 (default: 1)
  presence_penalty: number;  // OpenAI only, -2 to 2 (default: 0)
  frequency_penalty: number; // OpenAI only, -2 to 2 (default: 0)
}
```

**Note:** `presence_penalty` and `frequency_penalty` are only used with OpenAI models and ignored for Anthropic.

---

## Error Responses

All endpoints return standard HTTP error codes:

- `400 Bad Request` - Missing or invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Format:**
```json
{
  "error": "Error message",
  "details": "Detailed error information (if available)"
}
```

---

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/mychat
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

### 2. Database Setup

Run the database migrations:

```bash
# Generate migrations (already done)
pnpm drizzle-kit generate

# Push migrations to database
pnpm drizzle-kit push

# Or migrate using the migration files
pnpm drizzle-kit migrate
```

### 3. Start Development Server

```bash
pnpm dev
```

The API will be available at `http://localhost:5173/api`

---

## Testing with cURL

### Create a chat and send a message:

```bash
# 1. Create a new chat
CHAT_ID=$(curl -s -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat",
    "provider": "anthropic",
    "modelConfig": {
      "model": "claude-3-7-sonnet-20250219",
      "max_tokens": 1024,
      "temperature": 0.7,
      "top_p": 1,
      "presence_penalty": 0,
      "frequency_penalty": 0
    }
  }' | jq -r '.id')

echo "Created chat: $CHAT_ID"

# 2. Send a message
curl -N http://localhost:5173/api/messages \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$CHAT_ID\",
    \"content\": \"Tell me a short joke\"
  }"
```

---

## Frontend Integration Example

### Svelte 5 Component for Chat

```svelte
<script lang="ts">
  let message = $state('');
  let chatId = $state('1');
  let response = $state('');
  let streaming = $state(false);

  async function sendMessage() {
    if (!message.trim()) return;

    streaming = true;
    response = '';

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, content: message })
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.chunk) {
            response += data.chunk;
          } else if (data.done) {
            streaming = false;
          } else if (data.error) {
            console.error('Error:', data.error);
            streaming = false;
          }
        }
      }
    }

    message = '';
  }
</script>

<div>
  <textarea bind:value={message} placeholder="Type your message..."></textarea>
  <button onclick={sendMessage} disabled={streaming}>Send</button>
  <div>{response}</div>
</div>
```

---

## Next Steps

1. **Implement Authentication**: Add user authentication (JWT, OAuth, etc.)
2. **Add Folders API**: Create CRUD endpoints for folder management
3. **Implement Rate Limiting**: Protect against abuse
4. **Add WebSocket Support**: For real-time updates across devices
5. **Implement Message Editing**: Allow users to edit previous messages
6. **Add Chat Sharing**: Enable sharing chats with other users
7. **Implement Search**: Add full-text search across messages

---

## Support

For issues or questions, please refer to the main project README or create an issue in the repository.
