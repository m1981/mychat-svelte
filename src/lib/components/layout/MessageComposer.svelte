<script lang="ts">
	import { chats, generating, currentChatIndex } from '$lib/stores/chat.store';
	import { get } from 'svelte/store';
	import { handleError } from '$lib/utils/error-handler';
	import { streamingService } from '$lib/services/streaming.service';
	import type { Message } from '$lib/types/chat';

	let prompt = $state('');

	async function handleSubmit() {
		const currentPrompt = prompt.trim();
		if (!currentPrompt || $streamingService.isActive) return;

		prompt = '';

		const allChats = get(chats);
		const currentIndex = get(currentChatIndex);

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

		// 1. Add user message
		const userMessage: Message = { role: 'user', content: currentPrompt };

		// 2. Create the assistant placeholder
		const assistantMessagePlaceholder: Message = { role: 'assistant', content: '' };

		// 3. Create new messages array
		const newMessages = [...currentChat.messages, userMessage, assistantMessagePlaceholder];

		// 4. Create new chat object to trigger reactivity
		const updatedChat = {
			...currentChat,
			messages: newMessages
		};

		// 5. Update the allChats array with the new chat object
		allChats[currentIndex] = updatedChat;

		// 6. Trigger reactivity by setting the store
		chats.set([...allChats]);

		// 7. Create the API payload (without the placeholder)
		// Normalize messages to only include role and content for API
		const normalizedMessages = updatedChat.messages.slice(0, -1).map(msg => ({
			role: msg.role,
			content: msg.content
		}));

		const apiPayload = {
			...updatedChat,
			userId: 1,
			messages: normalizedMessages
		};

		console.log('📤 Sending to API:', {
			chatId: updatedChat.id,
			messageCount: normalizedMessages.length,
			lastMessage: normalizedMessages[normalizedMessages.length - 1]
		});

		// 4. Kick off the service, passing the placeholder object
		streamingService.generateResponse(apiPayload, assistantMessagePlaceholder);
			}

	$effect(() => {
		generating.set($streamingService.isActive);
    });
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="w-full max-w-4xl mx-auto">
	<div class="relative">
		<textarea
			bind:value={prompt}
			disabled={$streamingService.isActive}
			rows="1"
			class="textarea textarea-bordered w-full pr-16 resize-none"
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
			class="btn btn-primary btn-square absolute bottom-2 right-2"
			disabled={!prompt.trim() || $streamingService.isActive}
			aria-label="Send"
		>
			{#if $streamingService.isActive}
				<span class="loading loading-spinner"></span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
			{/if}
		</button>
	</div>
</form>