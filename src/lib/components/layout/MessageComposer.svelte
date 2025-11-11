<!-- src/lib/components/layout/MessageComposer.svelte -->
<script lang="ts">
	import { chats, currentChatIndex, updateChat } from '$lib/stores/chat.store';
	import { get } from 'svelte/store';
	import { handleError } from '$lib/utils/error-handler';
	import { streamingService } from '$lib/services/streaming.service';
	import type { Message } from '$lib/types/chat';

	let prompt = $state('');

	async function handleSubmit() {
		const currentPrompt = prompt.trim();
		if (!currentPrompt || $streamingService.isActive) return;

		// Clear input immediately for better UX
		prompt = '';

		const allChats = get(chats);
		const currentIndex = get(currentChatIndex);

		// Validation
		if (!allChats || allChats.length === 0) {
			handleError(new Error('No chats available.'));
			return;
		}

		if (currentIndex < 0 || currentIndex >= allChats.length) {
			handleError(new Error('Invalid chat index.'));
			return;
		}

		const currentChat = allChats[currentIndex];

		if (!currentChat) {
			handleError(new Error('No active chat selected.'));
			return;
		}

		// 1. Create user message
		const userMessage: Message = { role: 'user', content: currentPrompt };

		// 2. Create assistant placeholder
		const assistantMessagePlaceholder: Message = { role: 'assistant', content: '' };

		// 3. Create updated messages array
		const newMessages = [...currentChat.messages, userMessage, assistantMessagePlaceholder];

		// 4. Update chat in store (optimistic update for UI)
		const updatedChat = {
			...currentChat,
			messages: newMessages
		};

		// Temporarily update store for immediate UI feedback
		chats.update(allChats => {
			const updated = [...allChats];
			updated[currentIndex] = updatedChat;
			return updated;
		});

		// 5. Prepare API payload (without placeholder, normalized messages)
		const normalizedMessages = updatedChat.messages.slice(0, -1).map(msg => ({
			role: msg.role,
			content: msg.content
		}));

		const apiPayload = {
			...updatedChat,
			userId: 1, // TODO: Get from auth
			messages: normalizedMessages
		};

		console.log('📤 Sending to API:', {
			chatId: updatedChat.id,
			messageCount: normalizedMessages.length,
			lastMessage: normalizedMessages[normalizedMessages.length - 1]
		});

		// 6. Start streaming (service will update the placeholder)
		try {
			await streamingService.generateResponse(apiPayload, assistantMessagePlaceholder);

			// ✅ 7. CRITICAL: After streaming completes, persist to IndexedDB via store
			const finalChat = get(chats)[currentIndex];
			if (finalChat) {
				console.log('💾 Persisting chat after streaming complete');
				await updateChat(finalChat.id, {
					messages: finalChat.messages,
					metadata: {
						...finalChat.metadata,
						messageCount: finalChat.messages.length,
						tokenCount: (finalChat.metadata?.tokenCount || 0) +
							finalChat.messages[finalChat.messages.length - 1].content.length,
						lastMessageAt: new Date()
					}
				});
				console.log('✅ Chat persisted to IndexedDB');
			}
		} catch (error) {
			console.error('❌ Streaming failed:', error);
			handleError(error as Error);

			// Remove the failed assistant message placeholder
			chats.update(allChats => {
				const updated = [...allChats];
				if (updated[currentIndex]) {
					updated[currentIndex] = {
						...updated[currentIndex],
						messages: updated[currentIndex].messages.slice(0, -1)
					};
				}
				return updated;
    });
		}
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="w-full max-w-4xl mx-auto">
	<div class="relative">
		<textarea
			bind:value={prompt}
			disabled={$streamingService.isActive}
			rows="1"
			class="textarea w-full pr-16 resize-none border border-surface-200-800 rounded p-2"
			placeholder="Type a message..."
			onkeydown={(e) => {
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					handleSubmit();
				}
			}}
		></textarea>
		<button
			type="submit"
			class="btn btn-filled-primary btn-icon absolute bottom-2 right-2"
			disabled={!prompt.trim() || $streamingService.isActive}
			aria-label="Send"
		>
			{#if $streamingService.isActive}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
			{/if}
		</button>
	</div>
</form>