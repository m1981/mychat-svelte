<!-- File: src/lib/components/menu/NewChat.svelte -->
<script lang="ts">
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';

	let { folder, showOnHover = false }: { folder?: string; showOnHover?: boolean } = $props();

	let hovered = $state(false);
	let creating = $state(false);

	async function addChat() {
		if (creating) return;
		creating = true;
		try {
			const chatId = await app.createChat(folder ?? null);
			goto(`/chat/${chatId}`);
		} catch {
			// error toast shown by app.createChat
		} finally {
			creating = false;
		}
	}
</script>

<button
	data-testid="new-chat-btn"
	class="new-chat-btn {folder ? 'new-chat-btn--folder' : 'new-chat-btn--standalone'} new-chat-btn--normal"
	onclick={addChat}
	disabled={creating}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	{#if folder}
		<div
			class="new-chat-folder-content"
			class:new-chat-folder-content--visible={showOnHover || hovered}
			class:new-chat-folder-content--hidden={!showOnHover && !hovered}
		>
			{#if creating}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<PlusIcon />
			{/if}
			New Chat
		</div>
	{:else}
		{#if creating}
			<span class="loading loading-spinner loading-xs"></span>
		{:else}
			<PlusIcon />
		{/if}
		New Chat
	{/if}
</button>
