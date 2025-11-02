<!-- src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chats } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { streamingService } from '$lib/services/streaming.service';

	const chatId = $derived($page.params.id);
	const currentChat = $derived($chats.find((c) => c.id === chatId));

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

		<!-- --- FIX: Use store syntax --- -->
		{#if currentChat.messages.length === 0 && !$streamingService.isActive}
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

				<!-- --- FIX: Use store syntax --- -->
				{#if $streamingService.isActive && $streamingService.activeChatId === currentChat.id}
					<div class="chat chat-end">
						<div class="chat-bubble">
							{$streamingService.content}
							<span class="loading loading-dots loading-xs ml-1"></span>
						</div>
			</div>
		{/if}
	</div>
		{/if}
	</div>
{:else}
	<!-- ... -->
{/if}