<!-- src/lib/components/menu/ChatHistory.svelte -->
<script lang="ts">
	import type { Chat } from '$lib/types/chat';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import { chats, updateChat, deleteChat } from '$lib/stores/chat.store';
	import { toast } from '$lib/stores/toast.store';
	import { handleError } from '$lib/utils/error-handler';
	import { tick } from 'svelte';

	let { chat, index }: { chat: Chat; index: number } = $props();

	let isRenaming = $state(false);
	let editedTitle = $state(chat.title);
	let hovered = $state(false);
	let inputElement: HTMLInputElement | undefined = $state();
	let isDeleting = $state(false);

	// Check if this chat is active based on the current route
	const isActive = $derived($page.url.pathname.endsWith(chat.id));

	function navigateToChat() {
		if (!isRenaming) {
			goto(`/chat/${chat.id}`).catch((error) => {
				handleError(error, 'Failed to navigate to chat');
			});
	}
	}

	async function startRename(e: Event) {
		e.stopPropagation();
		isRenaming = true;
		editedTitle = chat.title;

		// Focus manually after DOM update (better than autofocus for a11y)
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	async function handleRename() {
		if (!editedTitle.trim()) {
			toast.warning('Chat title cannot be empty');
			editedTitle = chat.title;
			isRenaming = false;
			return;
		}

		if (editedTitle.trim() === chat.title) {
			isRenaming = false;
			return;
		}

		try {
			// Use enhanced store function (local-first)
			await updateChat(chat.id, { title: editedTitle.trim() });

			toast.success('Chat renamed successfully', {
				duration: 2000
			});

			console.log(`✅ Renamed chat ${chat.id} to: ${editedTitle}`);
		} catch (error) {
			console.error('Failed to rename chat:', error);
			toast.error('Failed to rename chat');
			editedTitle = chat.title;
		}

		isRenaming = false;
	}

	function cancelRename() {
		isRenaming = false;
		editedTitle = chat.title;
	}

	async function handleDelete(e: Event) {
		e.stopPropagation();

		// Show confirmation dialog
		if (!confirm(`Delete "${chat.title}"?`)) {
			return;
		}

		isDeleting = true;

		try {
			// If we're deleting the currently active chat, navigate away first
			if (isActive) {
				const allChats = $chats;
				const updatedChats = allChats.filter((c) => c.id !== chat.id);

				if (updatedChats.length > 0) {
					// Navigate to the previous chat, or the first one if we deleted the first
					const newIndex = Math.max(0, index - 1);
					await goto(`/chat/${updatedChats[newIndex].id}`).catch((error) => {
						handleError(error, 'Failed to navigate after deletion');
					});
				} else {
					// No chats left, go to home
					await goto('/').catch((error) => {
						handleError(error, 'Failed to navigate to home');
					});
				}
			}

			// Use enhanced store function (local-first)
			await deleteChat(chat.id);

			toast.success('Chat deleted successfully', {
				duration: 2000
			});

			console.log(`✅ Deleted chat: ${chat.id}`);
		} catch (error) {
			console.error('Failed to delete chat:', error);
			toast.error('Failed to delete chat');
		}

		isDeleting = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleRename();
		} else if (e.key === 'Escape') {
			cancelRename();
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