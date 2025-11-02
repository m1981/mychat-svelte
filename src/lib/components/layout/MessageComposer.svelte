<script lang="ts">
	import { chats, generating, currentChatIndex } from '$lib/stores/chat.store';
	import { get } from 'svelte/store';
	import { handleError } from '$lib/utils/error-handler';
	import { streamingService } from '$lib/services/streaming.service';

	let prompt = $state('');

	async function handleSubmit() {
		const currentPrompt = prompt.trim();
		// --- FIX: Use store syntax ---
		if (!currentPrompt || $streamingService.isActive) return;

		prompt = '';

		const allChats = get(chats);
		const currentIndex = get(currentChatIndex);
		const currentChat = allChats[currentIndex];

		if (!currentChat) {
			handleError(new Error('No active chat selected.'));
			return;
		}

		currentChat.messages.push({ role: 'user', content: currentPrompt });
		chats.set([...allChats]);

		const apiPayload = {
			...currentChat,
			messages: [...currentChat.messages]
		};

		streamingService.generateResponse(apiPayload);
			}

	// Also update the `generating` store for other UI elements
	$effect(() => {
		// --- FIX: Use store syntax ---
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
			placeholder="Type your message..."
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
			aria-label="Send message"
		>
			{#if $streamingService.isActive}
				<span class="loading loading-spinner"></span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
			{/if}
		</button>
	</div>
</form>