import { handleError } from '$lib/utils/error-handler';
import { chats } from '$lib/stores/chat.store';
import type { Chat } from '$lib/types/chat';
import { writable, get } from 'svelte/store';

// This function creates our custom store object
function createStreamingStore() {
	// Use writable stores for the internal state
	const { subscribe, update } = writable({
		content: '',
		isActive: false,
		activeChatId: null as string | null
	});

	// The main function to start the stream
	const generateResponse = async (currentChat: Chat) => {
		// Prevent multiple streams at once
		if (get({ subscribe }).isActive) return;

		// --- Setup ---
		update((state) => ({
			...state,
			isActive: true,
			content: '', // Reset content
			activeChatId: currentChat.id
		}));

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
							// Use the `update` function to change the state
							update((state) => ({
								...state,
								content: state.content + chunk.content
							}));
						}
					} catch (error) {
						console.error('Failed to parse stream chunk:', line, error);
					}
				}
			}

			// --- Teardown and Persist Final State ---
			const finalContent = get({ subscribe }).content;
			chats.update((allChats) => {
				const chatToUpdate = allChats.find((c) => c.id === currentChat.id);
				if (chatToUpdate) {
					chatToUpdate.messages.push({ role: 'assistant', content: finalContent });
				}
				return [...allChats]; // Return new array to ensure reactivity
			});

		} catch (error) {
			handleError(error, 'Failed to generate response.');
			chats.update((allChats) => {
				const chatToUpdate = allChats.find((c) => c.id === currentChat.id);
				if (chatToUpdate) {
					chatToUpdate.messages.push({ role: 'assistant', content: 'Sorry, an error occurred.' });
				}
				return [...allChats];
			});
		} finally {
			// --- Reset State ---
			update(() => ({
				content: '',
				isActive: false,
				activeChatId: null
			}));
		}
	};

	return {
		subscribe,
		generateResponse
	};
}

// Export a singleton instance of our custom store
export const streamingService = createStreamingStore();