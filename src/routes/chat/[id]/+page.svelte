<!-- File: src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import MessageComposer from '$lib/components/layout/MessageComposer.svelte';

	let { data } = $props();
	const chatId = $derived($page.params.id);
	const currentChatMetadata = $derived(app.chats.find((c) => c.id === chatId));

	let chatInstance = $state(new Chat({
		transport: new DefaultChatTransport({ api: `/api/chat/${$page.params.id}` }),
		messages: data.messages
	}));

	$effect(() => {
		chatInstance = new Chat({
			transport: new DefaultChatTransport({ api: `/api/chat/${chatId}` }),
			messages: data.messages
		});
	});

	$effect(() => {
		app.activeChatId = chatId || null;
		if (app.chats.length > 0 && !currentChatMetadata) {
			goto('/');
		}
	});
</script>

{#if currentChatMetadata}
	<div class="flex flex-col h-full">
		<div class="p-4 border-b border-base-300">
			<h1 class="text-xl font-bold">{currentChatMetadata.title}</h1>
		</div>

		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			<!-- 🟢 FIX 2: Use chatInstance.messages everywhere -->
			{#if chatInstance.messages.length === 0}
				<div class="text-center text-base-content/50 mt-12">
					<p>No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each chatInstance.messages as message}
					<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
						<div class="chat-bubble">
							<!-- In v5, text is inside the parts array -->
							{#each message.parts as part}
								{#if part.type === 'text'}
									{part.text}
								{/if}
							{/each}
						</div>
					</div>
				{/each}

				<!-- 🟢 FIX 3: Use chatInstance.status and chatInstance.messages -->
				{#if chatInstance.status === 'streaming' && chatInstance.messages[chatInstance.messages.length - 1]?.role === 'user'}
					<div class="chat chat-start">
						<div class="chat-bubble">
							<span class="loading loading-dots loading-sm"></span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Pass SDK stores to the composer -->
		<div class="p-4 bg-base-200 border-t border-base-300">
			<!-- 🟢 FIX 4: Pass chatInstance methods and properties explicitly -->
			<MessageComposer
				sendMessage={(msg) => chatInstance.sendMessage(msg)}
				status={chatInstance.status}
			/>
		</div>
	</div>
{/if}