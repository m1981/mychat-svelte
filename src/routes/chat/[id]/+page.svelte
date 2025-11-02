<!-- src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chats } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';

	const chatId = $derived($page.params.id);
	const currentChat = $derived($chats.find((c) => c.id === chatId));

	// If chat doesn't exist, redirect to home
	$effect(() => {
		if (!currentChat) {
			goto('/');
		}
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
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="flex items-center justify-center h-full">
		<div class="loading loading-spinner loading-lg"></div>
	</div>
{/if}