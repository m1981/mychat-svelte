// In a new file, e.g., src/lib/services/chat.service.ts
import { api } from '$lib/api/client'; // We'll need to adapt this for streaming
import { chats, generating, currentChatIndex } from '$lib/stores/chat.store';
import { get } from 'svelte/store';
import type { Message } from '$lib/types/chat';

export async function generateResponse() {
    const allChats = get(chats);
    const currentIndex = get(currentChatIndex);
    const currentChat = allChats[currentIndex];

    if (!currentChat) return;

    generating.set(true);

    // Add a placeholder for the assistant's message
    const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        chatId: currentChat.id,
        role: 'assistant',
        content: '',
        tags: [],
        highlights: [],
        createdAt: new Date()
    };
    chats.update(c => {
        c[currentIndex].messages.push(assistantMessage);
        return c;
    });

    const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentChat)
    });

    if (!response.body) return;

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Process newline-delimited JSON chunks
        const lines = value.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
    try {
            const chunk = JSON.parse(line);
            if (chunk.type === 'chunk') {
                // Append content to the last message
                chats.update(c => {
                    const lastMessage = c[currentIndex].messages.at(-1);
                    if (lastMessage) {
                        lastMessage.content += chunk.content;
                    }
                    return c;
                });
            } else if (chunk.type === 'done') {
            // ... handle done
        }
    } catch (error) {
        console.warn('Failed to parse stream chunk:', line, error);
            }
        }
    }

    generating.set(false);
}