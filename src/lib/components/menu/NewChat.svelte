<!-- File: src/lib/components/menu/NewChat.svelte -->
<script lang="ts">
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';
	import { createId } from '@paralleldrive/cuid2';

	let { folder, showOnHover = false }: { folder?: string; showOnHover?: boolean } = $props();
	let hovered = $state(false);

	function addChat() {
		const chatId = createId();

		app.chats.push({
			id: chatId,
			userId: 'temp-user',
			title: 'New Chat',
			modelId: 'gpt-4o',
			tags: [],
			folderId: folder || null,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		goto(`/chat/${chatId}`);
	}
</script>

<!-- Template remains exactly the same, just remove $generating checks -->
<button
	class="new-chat-btn {folder ? 'new-chat-btn--folder' : 'new-chat-btn--standalone'} new-chat-btn--normal"
	onclick={addChat}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	{#if folder}
		<div class="new-chat-folder-content" class:new-chat-folder-content--visible={showOnHover || hovered} class:new-chat-folder-content--hidden={!showOnHover && !hovered}>
			<PlusIcon /> New Chat
		</div>
	{:else}
		<PlusIcon /> New Chat
	{/if}
</button>