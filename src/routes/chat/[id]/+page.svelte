<!-- File: src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chats } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { streamingService } from '$lib/services/streaming.service';

	let { data } = $props(); // Get the messages from +page.server.ts

	const chatId = $derived($page.params.id);
	const currentChatMetadata = $derived($chats.find((c) => c.id === chatId));

	// Combine the metadata from the store with the messages from the server
	const currentChat = $derived(currentChatMetadata ? {
		...currentChatMetadata,
		messages: data.messages // Inject the loaded messages
	} : null);

	$effect(() => {
		const timer = setTimeout(() => {
			if ($chats.length > 0 && !currentChat) {
				goto('/');
			}
		}, 100);
		return () => clearTimeout(timer);
	});
</script>

{#if currentChat}
	<div class="p-4">
		<h1 class="text-2xl font-bold mb-4">{currentChat.title}</h1>

		{#if currentChat.messages.length === 0}
			<div class="text-center text-base-content/50 mt-12">
				<p>No messages yet. Start the conversation!</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each currentChat.messages as message}
					<div class="chat" class:chat-start={message.role === 'user'} class:chat-end={message.role === 'assistant'}>
						<div class="chat-bubble">
							{message.content}
							{#if message.role === 'assistant' && $streamingService.isActive && $streamingService.activeChatId === currentChat.id && currentChat.messages.at(-1) === message}
								<span class="loading loading-dots loading-xs ml-1"></span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}