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

	// Create a single, flat, ordered list of all draggable items for dndzone
	const draggableItems = $derived.by(() => {
		const items: DraggableItem[] = [];

		const sortedFolders: Folder[] = Object.values(allFolders).sort((a, b) => a.order - b.order);

		sortedFolders.forEach((folder) => {
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

<div
	class="w-full"
	use:dndzone={{ items: draggableItems, flipDurationMs: 150 }}
	onfinalize={handleDndFinalize}
>
	{#each filteredRenderList as item (item.id)}
		<div animate:flip={{ duration: 150 }}>
			{#if item.type === 'folder'}
				{@const folderChats = allChats.filter((c) => c.folder === item.id)}
				<!-- ✅ CORRECT: Pass allChats as a prop -->
				<ChatFolder folder={item} {folderChats} chats={allChats} />
			{:else if !item.folder}
				<!-- ✅ CORRECT: Calculate index from derived allChats -->
				{@const chatIndex = allChats.findIndex((c) => c.id === item.id)}
					<ChatHistory chat={item} index={chatIndex} />
				{/if}
			</div>
	{/each}
</div>