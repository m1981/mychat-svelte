<!-- src/lib/components/menu/ChatFolder.svelte -->
<script lang="ts">
	import type { Chat, Folder } from '$lib/types/chat';
	import ChatHistory from './ChatHistory.svelte';
	import FolderIcon from '$lib/components/icons/FolderIcon.svelte';
	import NewChat from './NewChat.svelte';
	import ColorPaletteIcon from '$lib/components/icons/ColorPaletteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import { folders } from '$lib/stores/chat.store';

	let {
		folder,
		folderChats,
		chats
	}: {
		folder: Folder;
		folderChats: Chat[];
		chats: Chat[];
	} = $props();

	let hovered = $state(false);

	function toggleExpanded() {
		folders.update((allFolders) => {
			if (allFolders[folder.id]) {
			allFolders[folder.id].expanded = !allFolders[folder.id].expanded;
			}
			return allFolders;
		});
	}
</script>

<div class="chat-folder" data-folder-id={folder.id}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="folder-header"
		class:folder-header--normal={!folder.color}
		class:folder-header--colored={folder.color}
		style:background-color={hovered && folder.color ? `${folder.color}dd` : folder.color}
		style:color={folder.color ? 'var(--color-primary-content)' : ''}
		onclick={toggleExpanded}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
	>
		<div class="folder-icon-container">
			<FolderIcon />
		</div>
		<div class="folder-name-container">
			<span class="folder-name-text">{folder.name}</span>
			{#if !hovered}
			<div
					class="folder-gradient"
					style:background={folder.color
						? `linear-gradient(to left, ${folder.color}, transparent)`
						: ''}
			></div>
			{/if}
		</div>
		<div class="folder-actions" onclick={(e) => e.stopPropagation()}>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 2;"
				title="Change folder color"
			>
				<ColorPaletteIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 1;"
				title="Edit folder name"
			>
				<EditIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 0;"
				title="Delete folder"
			>
				<DeleteIcon />
			</button>
		</div>
	</div>

	{#if folder.expanded}
		<div class="folder-content">
			<NewChat folder={folder.id} showOnHover={hovered} />
			<div class="folder-droppable-area">
				{#each folderChats as chat (chat.id)}
					{@const chatIndex = chats.findIndex((c) => c.id === chat.id)}
					<ChatHistory {chat} index={chatIndex} />
				{/each}
			</div>
		</div>
	{/if}
</div>