<!-- src/lib/components/menu/ChatHistory.svelte -->
<script lang="ts">
	import type { Chat } from '$lib/types/chat';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import { chats } from '$lib/stores/chat.store';

	let { chat, index }: { chat: Chat; index: number } = $props();

	let isRenaming = $state(false);
	let editedTitle = $state(chat.title);
	let hovered = $state(false);

	// Check if this chat is active based on the current route
	const isActive = $derived($page.url.pathname.endsWith(chat.id));

	function navigateToChat() {
		if (!isRenaming) {
		goto(`/chat/${chat.id}`);
	}
	}

	function startRename(e: Event) {
		e.stopPropagation();
		isRenaming = true;
		editedTitle = chat.title;
	}

	function handleRename() {
		if (editedTitle.trim() && editedTitle !== chat.title) {
			chats.update((allChats) => {
				const updatedChats = [...allChats];
				const chatIndex = updatedChats.findIndex((c) => c.id === chat.id);
				if (chatIndex !== -1) {
					updatedChats[chatIndex] = {
						...updatedChats[chatIndex],
						title: editedTitle.trim()
					};
				}
				return updatedChats;
			});
			console.log(`✅ Renamed chat ${chat.id} to: ${editedTitle}`);
		}
		isRenaming = false;
	}

	function cancelRename() {
		isRenaming = false;
		editedTitle = chat.title;
	}

	function handleDelete(e: Event) {
		e.stopPropagation();

		// Show confirmation dialog
		if (!confirm(`Delete "${chat.title}"?`)) {
			return;
		}

		chats.update((allChats) => {
			const updatedChats = allChats.filter((c) => c.id !== chat.id);

			// If we're deleting the currently active chat, navigate away
			if (isActive && updatedChats.length > 0) {
				// Navigate to the previous chat, or the first one if we deleted the first
				const newIndex = Math.max(0, index - 1);
				goto(`/chat/${updatedChats[newIndex].id}`);
			} else if (updatedChats.length === 0) {
				// No chats left, go to home
				goto('/');
			}

			return updatedChats;
		});

		console.log(`✅ Deleted chat: ${chat.id}`);
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
	onclick={navigateToChat}
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
>
	<div class="chat-content-area">
		<div class="chat-title-container">
			{#if isRenaming}
				<input
					type="text"
					class="chat-name-input"
					bind:value={editedTitle}
					onblur={handleRename}
					onkeydown={handleKeydown}
					onclick={(e) => e.stopPropagation()}
					autofocus
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
		<button
			class="chat-action-btn"
			style="--button-index: 1;"
			onclick={startRename}
			title="Rename chat"
		>
			<EditIcon />
		</button>
<button
			class="chat-action-btn"
			style="--button-index: 0;"
			onclick={handleDelete}
			title="Delete chat"
>
			<DeleteIcon />
</button>
	</div>
</div>