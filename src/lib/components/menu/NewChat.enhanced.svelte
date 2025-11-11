<!-- src/lib/components/menu/NewChat.enhanced.svelte -->
<script lang="ts">
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import { generating, createChat } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.store';

	let { folder, showOnHover = false }: { folder?: string; showOnHover?: boolean } = $props();
	let hovered = $state(false);
	let isCreating = $state(false);

	/**
	 * Creates a new chat with local-first approach
	 * - Saves to IndexedDB immediately
	 * - Updates UI optimistically
	 * - Syncs to server in background
	 */
	async function addChat() {
		if ($generating || isCreating) return;

		isCreating = true;

		try {
			// Create chat using enhanced store (local-first)
			const newChat = await createChat({
				title: 'New Chat',
				folderId: folder
			});

			// Navigate to the newly created chat
			goto(`/chat/${newChat.id}`);

			console.log(`✅ Created new chat: ${newChat.id}${folder ? ` in folder ${folder}` : ''}`);
		} catch (error) {
			console.error('Failed to create chat:', error);
			toast.error('Failed to create chat. Please try again.');
		} finally {
			isCreating = false;
		}
	}
</script>

{#if folder}
	<button
		class="new-chat-btn new-chat-btn--folder"
		class:new-chat-btn--normal={!$generating && !isCreating}
		class:new-chat-btn--disabled={$generating || isCreating}
		disabled={$generating || isCreating}
		onclick={addChat}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
		aria-label="New Chat"
	>
		<div
			class="new-chat-folder-content"
			class:new-chat-folder-content--visible={showOnHover || hovered}
			class:new-chat-folder-content--hidden={!showOnHover && !hovered}
		>
			{#if isCreating}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<PlusIcon />
			{/if}
			New Chat
		</div>
	</button>
{:else}
	<button
		class="new-chat-btn new-chat-btn--standalone"
		class:new-chat-btn--normal={!$generating && !isCreating}
		class:new-chat-btn--disabled={$generating || isCreating}
		disabled={$generating || isCreating}
		onclick={addChat}
		aria-label="New Chat"
	>
		{#if isCreating}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
			<PlusIcon />
		{/if}
		New Chat
	</button>
{/if}

<style>
	.new-chat-btn {
		/* Your existing styles */
	}
</style>