<script lang="ts">
	import type { Message } from '$lib/types/chat';
	import { streamingService } from '$lib/services/streaming.service';

	interface Props {
		messages: Message[];
		chatId: string;
	}

	let { messages, chatId }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-list">
	{#if messages.length === 0}
		<div class="text-center text-base-content/50 mt-12">
			<p>No messages yet. Start the conversation!</p>
		</div>
	{:else}
		{#each messages as message, index}
			<div
				class="chat"
				class:chat-start={message.role === 'user'}
				class:chat-end={message.role === 'assistant'}
				data-testid="message"
			>
				<div class="chat-bubble">
					{message.content}
					{#if message.role === 'assistant' && $streamingService.isActive && $streamingService.activeChatId === chatId && messages.at(-1) === message}
						<span class="loading loading-dots loading-xs ml-1" data-testid="ai-loading"></span>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>
