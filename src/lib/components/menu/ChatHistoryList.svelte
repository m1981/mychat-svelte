<!-- src/lib/components/menu/ChatHistoryList.svelte -->
<script lang="ts">
	import { chats, folders } from '$lib/stores/chat.store';
	import type { Chat, Folder, FolderCollection } from '$lib/types/chat';
	import ChatFolder from './ChatFolder.svelte';
	import ChatHistory from './ChatHistory.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	let { searchFilter }: { searchFilter: string } = $props();

	type DraggableItem = (Chat & { type: 'chat' }) | (Folder & { type: 'folder' });

	// ✅ CORRECT: Create derived state from store values at top level
	const allChats = $derived($chats);
	const allFolders = $derived($folders);

	// Separate archived and standard folders
	const standardFolders = $derived(
		Object.values(allFolders).filter((f) => f.type !== 'ARCHIVE').sort((a, b) => a.order - b.order)
	);

	const archivedFolders = $derived(
		Object.values(allFolders).filter((f) => f.type === 'ARCHIVE').sort((a, b) => a.order - b.order)
	);

	// State for collapsing/expanding the archived section
	let archivedSectionExpanded = $state(false);

	// Create a single, flat, ordered list of all draggable items for dndzone (excluding archived)
	const draggableItems = $derived.by(() => {
		const items: DraggableItem[] = [];

		standardFolders.forEach((folder) => {
			items.push({ ...folder, type: 'folder' });
			const folderChats = allChats.filter((chat) => chat.folder === folder.id);
			folderChats.forEach((chat) => items.push({ ...chat, type: 'chat' }));
		});

		const unorganizedChats = allChats.filter((chat) => !chat.folder);
		unorganizedChats.forEach((chat) => items.push({ ...chat, type: 'chat' }));
		return items;
	});

	// Filter the final rendered list based on the search term
	const filteredRenderList = $derived(
		draggableItems.filter(
			(item) =>
				item.type === 'folder' ||
				item.title.toLowerCase().includes(searchFilter.toLowerCase())
		)
	);

	function handleDndFinalize(e: CustomEvent) {
		const newOrderedItems: DraggableItem[] = e.detail.items;

		const newFolders: FolderCollection = {};
		const newChats: Chat[] = [];
		let currentFolderId: string | undefined = undefined;
		let folderOrder = 0;

		newOrderedItems.forEach((item) => {
			if (item.type === 'folder') {
				currentFolderId = item.id;
				newFolders[item.id] = {
					id: item.id,
					name: item.name,
					expanded: item.expanded,
					order: folderOrder++,
					color: item.color
				};
			} else if (item.type === 'chat') {
				newChats.push({
					id: item.id,
					title: item.title,
					messages: item.messages,
					config: item.config,
					folder: currentFolderId
				});
			}
		});

		// Update stores with the new structure
		folders.set(newFolders);
		chats.set(newChats);
	}
</script>

<div class="w-full">
	<!-- Main section with standard folders and chats -->
	<div
		use:dndzone={{ items: draggableItems, flipDurationMs: 150 }}
		onfinalize={handleDndFinalize}
	>
		{#each filteredRenderList as item (item.id)}
			<div>
				{#if item.type === 'folder'}
					{@const folderChats = allChats.filter((c) => c.folder === item.id)}
					<ChatFolder folder={item} {folderChats} chats={allChats} />
				{:else if !item.folder}
					{@const chatIndex = allChats.findIndex((c) => c.id === item.id)}
					<ChatHistory chat={item} index={chatIndex} />
				{/if}
			</div>
		{/each}
	</div>

	<!-- Archived section -->
	{#if archivedFolders.length > 0}
		<div class="archived-section">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="archived-header" onclick={() => (archivedSectionExpanded = !archivedSectionExpanded)}>
				<svg
					class="archived-chevron"
					class:expanded={archivedSectionExpanded}
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
				<span class="archived-title">Archived ({archivedFolders.length})</span>
			</div>
			{#if archivedSectionExpanded}
				<div class="archived-content">
					{#each archivedFolders as folder (folder.id)}
						{@const folderChats = allChats.filter((c) => c.folder === folder.id)}
						<ChatFolder {folder} {folderChats} chats={allChats} />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.archived-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-base-300);
	}

	.archived-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.2s;
		user-select: none;
	}

	.archived-header:hover {
		background-color: var(--color-base-200);
	}

	.archived-chevron {
		transform: rotate(-90deg);
		transition: transform 0.2s;
		flex-shrink: 0;
	}

	.archived-chevron.expanded {
		transform: rotate(0deg);
	}

	.archived-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-base-content);
		opacity: 0.7;
	}

	.archived-content {
		margin-top: 0.5rem;
	}
</style>