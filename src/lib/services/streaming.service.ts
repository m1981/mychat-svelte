import { handleError } from '$lib/utils/error-handler';
import { chats } from '$lib/stores/chat.store';
import type { Chat, Message } from '$lib/types/chat';
import { writable, get } from 'svelte/store';

function createStreamingStore() {
	const { subscribe, update } = writable({
		isActive: false,
		activeChatId: null as string | null
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
							assistantMessagePlaceholder.content += chunk.content;
							chats.set(get(chats));
						}
					} catch (error) {
						console.error('Failed to parse stream chunk:', line, error);
					}
				}
			}
		} catch (error) {
			handleError(error, 'Failed to generate response.');
			assistantMessagePlaceholder.content = 'Sorry, an error occurred.';
			chats.set(get(chats));
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