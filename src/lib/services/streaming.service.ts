import { handleError } from '$lib/utils/error-handler';
import { chats } from '$lib/stores/chat.store';
import type { Chat } from '$lib/types/chat';
import { writable, get } from 'svelte/store';

function createStreamingStore() {
	const { subscribe, update } = writable({
		isActive: false,
		activeChatId: null as string | null
		// --- REMOVE `content` ---
	});

	const generateResponse = async (currentChat: Chat, assistantMessagePlaceholder: Message) => {
		if (get({ subscribe }).isActive) return;

		update((state) => ({
			...state,
			isActive: true,
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

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const lines = value.split('\n').filter((line) => line.trim() !== '');
				for (const line of lines) {
					try {
						const chunk = JSON.parse(line);
						if (chunk.type === 'chunk') {
							// --- THE CORE FIX ---
							// Directly mutate the placeholder and trigger a store update
							assistantMessagePlaceholder.content += chunk.content;
							chats.set(get(chats)); // Force update by setting the store to its current value
						}
					} catch (error) {
						console.error('Failed to parse stream chunk:', line, error);
					}
				}
			}
			// No need to update the chats store here, it's already been updated live.
		} catch (error) {
			handleError(error, 'Failed to generate response.');
			assistantMessagePlaceholder.content = 'Sorry, an error occurred.';
			chats.set(get(chats)); // Update with error message
		} finally {
			update(() => ({
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

export const streamingService = createStreamingStore();