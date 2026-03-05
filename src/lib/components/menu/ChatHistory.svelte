<!-- src/lib/components/menu/ChatHistory.svelte -->
<script lang="ts">
	import type { Chat } from '$lib/types/models';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import { app } from '$lib/state/app.svelte';
	import { toast } from '$lib/stores/toast.store';
	import { tick } from 'svelte';

	let { chat, index }: { chat: Chat; index: number } = $props();

	let isRenaming = $state(false);
	let editedTitle = $state(chat.title);
	let hovered = $state(false);
	let inputElement: HTMLInputElement | undefined = $state();
	let isDeleting = $state(false);

	const isActive = $derived($page.url.pathname.endsWith(chat.id));

	function navigateToChat() {
		if (!isRenaming && !isDeleting) goto(`/chat/${chat.id}`);
	}

	async function startRename(e: Event) {
		e.stopPropagation();
		isRenaming = true;
		editedTitle = chat.title;
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	function handleRename() {
		if (editedTitle.trim() && editedTitle !== chat.title) {
			const chatIndex = app.chats.findIndex(c => c.id === chat.id);
			if (chatIndex !== -1) {
				app.chats[chatIndex].title = editedTitle.trim();
				toast.success('Chat renamed');
			}
		}
		isRenaming = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleRename();
		} else if (e.key === 'Escape') {
			isRenaming = false;
			editedTitle = chat.title;
		}
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		if (confirm(`Delete "${chat.title}"?`)) {
			isDeleting = true;
			app.chats = app.chats.filter(c => c.id !== chat.id);
			toast.success('Chat deleted');
			if (isActive) goto('/');
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="chat-history-item"
	class:chat-history-active={isActive}
	class:chat-history-item--hovered={hovered}
	class:opacity-50={isDeleting}
	class:pointer-events-none={isDeleting}
	onclick={navigateToChat}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	<div class="chat-content-area">
		<div class="chat-title-container">
			{#if isRenaming}
				<input
					bind:this={inputElement}
					type="text"
					class="chat-name-input"
					bind:value={editedTitle}
					onblur={handleRename}
					onkeydown={handleKeydown}
					onclick={(e) => e.stopPropagation()}
					maxlength="100"
				/>
			{:else}
				<span class="chat-title-text">{chat.title}</span>
			{/if}
		</div>
		<div
			class="chat-title-gradient"
			class:chat-title-gradient--hovered={hovered && !isActive}
			class:chat-title-gradient--active={isActive}
		></div>
	</div>

	<div
		class="chat-actions"
		class:chat-actions--active={isActive}
		onclick={(e) => e.stopPropagation()}
	>
		{#if isDeleting}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
		<button
			class="chat-action-btn"
			style="--button-index: 1;"
			onclick={startRename}
			title="Rename chat"
				disabled={isDeleting}
		>
			<EditIcon />
		</button>
<button
			class="chat-action-btn"
			style="--button-index: 0;"
			onclick={handleDelete}
			title="Delete chat"
				disabled={isDeleting}
>
			<DeleteIcon />
</button>
		{/if}
	</div>
</div>