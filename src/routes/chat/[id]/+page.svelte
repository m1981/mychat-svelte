<!-- File: src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { marked } from 'marked';
	import MessageComposer from '$lib/components/layout/MessageComposer.svelte';

	let { data } = $props();
	const chatId = $derived($page.params.id);
	const currentChatMetadata = $derived(app.chats.find((c) => c.id === chatId));

	let chatInstance = $state(new Chat({
		transport: new DefaultChatTransport({ api: `/api/chat/${$page.params.id}` }),
		messages: data.messages
	}));

	// Map of AI SDK message id -> DB message id
	// Since page.server.ts sets id: String(m.id), AI SDK ids ARE DB ids for loaded messages
	let dbMessageMap = $state<Map<string, string>>(
		new Map(data.messages.map((m) => [m.id, m.id]))
	);

	// Popover state for text selection
	let popover = $state<{ x: number; y: number; text: string; messageId: string } | null>(null);

	$effect(() => {
		chatInstance = new Chat({
			transport: new DefaultChatTransport({ api: `/api/chat/${chatId}` }),
			messages: data.messages
		});
		dbMessageMap = new Map(data.messages.map((m) => [m.id, m.id]));
	});

	$effect(() => {
		app.activeChatId = chatId || null;
		if (app.chats.length > 0 && !currentChatMetadata) {
			goto('/');
		}
	});

	// Load notes and highlights when chat changes
	$effect(() => {
		if (chatId) {
			app.loadChatKnowledge(chatId);
		}
	});

	// Refresh chat title from server after streaming finishes (for auto-title)
	$effect(() => {
		if (chatInstance.status === 'ready') {
			const idx = app.chats.findIndex((c) => c.id === chatId);
			if (idx === -1) return;
			fetch(`/api/chats/${chatId}`)
				.then((r) => r.json())
				.then((updated) => {
					if (updated.title !== app.chats[idx]?.title) {
						app.chats[idx] = { ...app.chats[idx], title: updated.title };
					}
				})
				.catch(() => {});

			// Refresh DB message IDs after streaming
			// Match SDK messages to DB messages by position+role to get correct DB IDs
			fetch(`/api/chats/${chatId}/messages`)
				.then((r) => r.json())
				.then((dbMsgs: Array<{ id: string; role: string; content: string }>) => {
					const sdkMsgs = chatInstance.messages;
					const newMap = new Map<string, string>();
					// Match by position: SDK messages and DB messages should be in the same order
					sdkMsgs.forEach((sdkMsg, i) => {
						const dbMsg = dbMsgs[i];
						if (dbMsg && dbMsg.role === sdkMsg.role) {
							newMap.set(sdkMsg.id, dbMsg.id);
						}
					});
					dbMessageMap = newMap;
				})
				.catch(() => {});
		}
	});

	function handleSelectionChange(messageId: string) {
		const selection = window.getSelection();
		const text = selection?.toString().trim() ?? '';
		if (text.length < 3) {
			popover = null;
			return;
		}
		const range = selection!.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		// Use the DB message ID if available, otherwise use SDK id
		const dbId = dbMessageMap.get(messageId) ?? messageId;
		popover = { x: rect.left + rect.width / 2, y: rect.top - 8, text, messageId: dbId };
	}

	async function saveHighlight() {
		if (!popover) return;
		await app.saveHighlight(popover.messageId, popover.text);
		popover = null;
		window.getSelection()?.removeAllRanges();
	}
</script>

{#if currentChatMetadata}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		data-testid="chat-view"
		class="flex flex-col h-full"
		onmousedown={(e) => {
			if (!(e.target as Element).closest('[data-testid="save-highlight-btn"]')) {
				popover = null;
			}
		}}
	>
		<div class="p-4 border-b border-base-300 flex items-center justify-between">
			<h1 data-testid="chat-view-title" class="text-xl font-bold">{currentChatMetadata.title}</h1>
			<div class="flex gap-2">
				<button
					data-testid="toggle-notes-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'notes'}
					onclick={() =>
						(app.secondaryPanelTab = app.secondaryPanelTab === 'notes' ? 'closed' : 'notes')}
					title="Notes"
				>Notes</button>
				<button
					data-testid="toggle-highlights-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'highlights'}
					onclick={() =>
						(app.secondaryPanelTab =
							app.secondaryPanelTab === 'highlights' ? 'closed' : 'highlights')}
					title="Highlights"
				>Highlights</button>
				<button
					data-testid="toggle-search-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'search'}
					onclick={() =>
						(app.secondaryPanelTab = app.secondaryPanelTab === 'search' ? 'closed' : 'search')}
					title="Search"
				>Search</button>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#if chatInstance.messages.length === 0}
				<div class="text-center text-base-content/50 mt-12">
					<p>No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each chatInstance.messages as message}
					<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							data-testid="message-bubble"
							data-message-id={message.id}
							class="chat-bubble"
							onmouseup={message.role === 'assistant'
								? () => handleSelectionChange(message.id)
								: undefined}
						>
							{#each message.parts as part}
								{#if part.type === 'text'}
									{#if message.role === 'assistant'}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html marked.parse(part.text)}
									{:else}
										{part.text}
									{/if}
								{/if}
							{/each}
						</div>
					</div>
				{/each}

				{#if chatInstance.status === 'streaming' && chatInstance.messages[chatInstance.messages.length - 1]?.role === 'user'}
					<div class="chat chat-start">
						<div class="chat-bubble">
							<span class="loading loading-dots loading-sm"></span>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Floating highlight save button -->
		{#if popover}
			<div
				class="fixed z-50 -translate-x-1/2 -translate-y-full"
				style="left: {popover.x}px; top: {popover.y}px"
			>
				<button
					data-testid="save-highlight-btn"
					class="btn btn-xs btn-warning shadow-lg"
					onclick={saveHighlight}
				>
					Save Highlight
				</button>
			</div>
		{/if}

		<!-- Pass SDK stores to the composer -->
		<div class="p-4 bg-base-200 border-t border-base-300">
			<MessageComposer
				sendMessage={(msg) => chatInstance.sendMessage(msg)}
				status={chatInstance.status}
			/>
		</div>
	</div>
{/if}
