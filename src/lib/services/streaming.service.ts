import { handleError } from '$lib/utils/error-handler';
import { chats } from '$lib/stores/chat.store';
import type { Chat } from '$lib/types/chat';

// Use runes for reactive state. This is the key.
let streamingContent = $state('');
let isStreaming = $state(false);
let streamingChatId = $state<string | null>(null);

// This service is a singleton because it's a .ts file.
// The state is global and shared across the app.
export const streamingService = {
	// A reactive property to get the current streaming content
	get content() {
		return streamingContent;
	},
	// A reactive property to check if we are streaming
	get active() {
		return isStreaming;
	},
	// A reactive property to know which chat is streaming
	get activeChatId() {
		return streamingChatId;
	},

	// The main function to start the stream
	async generateResponse(currentChat: Chat) {
		if (isStreaming) return;

		// --- Setup ---
		isStreaming = true;
		streamingContent = ''; // Reset content for the new stream
		streamingChatId = currentChat.id;

		try {
			const response = await fetch('/api/chat/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentChat)
			});

			if (!response.ok || !response.body) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to get response stream.');
			}

			const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

			// --- Streaming Loop ---
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const lines = value.split('\n').filter((line) => line.trim() !== '');
				for (const line of lines) {
					try {
						const chunk = JSON.parse(line);
						if (chunk.type === 'chunk') {
							// This is a reactive assignment. Svelte 5 will see this change instantly.
							streamingContent += chunk.content;
						}
					} catch (error) {
						console.error('Failed to parse stream chunk:', line, error);
					}
				}
			}

			// --- Teardown and Persist Final State ---
			// The backend already persists the message. Now, update the Svelte store.
			chats.update((allChats) => {
				const chatToUpdate = allChats.find((c) => c.id === currentChat.id);
				if (chatToUpdate) {
					chatToUpdate.messages.push({ role: 'assistant', content: streamingContent });
				}
				return allChats;
			});

		} catch (error) {
			handleError(error, 'Failed to generate response.');
			// Add error message to the chat
			chats.update((allChats) => {
				const chatToUpdate = allChats.find((c) => c.id === currentChat.id);
				if (chatToUpdate) {
					chatToUpdate.messages.push({ role: 'assistant', content: 'Sorry, an error occurred.' });
				}
				return allChats;
			});
		} finally {
			// --- Reset State ---
			isStreaming = false;
			streamingChatId = null;
			streamingContent = '';
		}
	}
};