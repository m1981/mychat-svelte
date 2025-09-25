<!-- src/lib/components/menu/ChatHistoryList.svelte -->
<script lang="ts">
	import { chats, folders } from '$lib/stores/chat.store';
	import type { Chat, Folder, FolderCollection } from '$lib/types/chat';
	import ChatFolder from './ChatFolder.svelte';
	import ChatHistory from './ChatHistory.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';

	let { searchFilter }: { searchFilter: string } = $props();

	const allChats = $chats;
	const allFolders = $folders;
	const validChats = $derived(allChats.filter(Boolean));

	type DraggableItem = (Chat & { type: 'chat' }) | (Folder & { type: 'folder' });

	// The single source of truth for the order of ALL items.
	const draggableItems = $derived.by(() => {
		const items: DraggableItem[] = [];

		const sortedFolders: Folder[] = Object.values(allFolders).sort((a, b) => a.order - b.order);

		sortedFolders.forEach((folder) => {
			items.push({ ...folder, type: 'folder' });
			const folderChats = validChats.filter((chat) => chat.folder === folder.id);
			folderChats.forEach((chat) => items.push({ ...chat, type: 'chat' }));
		});

		const unorganizedChats = validChats.filter((chat) => !chat.folder);
		unorganizedChats.forEach((chat) => items.push({ ...chat, type: 'chat' }));

		// --- [DND DEBUG 1] ---
		console.log(
			`[DND DEBUG 1] Master 'draggableItems' list created. Total items: ${items.length}`,
			JSON.parse(JSON.stringify(items))
		);
		return items;
	});

	const visibleItemIds = $derived.by(() => {
		const searchTerm = searchFilter.toLowerCase();
		const visibleIds = new Set<string>();

		if (!searchTerm) {
			draggableItems.forEach((item) => {
				if (item.type === 'folder') {
					visibleIds.add(item.id);
				} else if (item.type === 'chat') {
					if (!item.folder || allFolders[item.folder]?.expanded) {
						visibleIds.add(item.id);
					}
		}
			});
		} else {
		const matchingIds = new Set<string>();
			draggableItems.forEach((item) => {
			const title = item.type === 'folder' ? item.name : item.title;
			if (title.toLowerCase().includes(searchTerm)) {
				matchingIds.add(item.id);
				if (item.type === 'chat' && item.folder) {
					matchingIds.add(item.folder);
				}
			}
				});

			matchingIds.forEach((id) => {
				const item = draggableItems.find((i) => i.id === id);
			if (item?.type === 'folder') {
					validChats.forEach((chat) => {
					if (chat.folder === id) {
						matchingIds.add(chat.id);
			}
		});
		}
		});
			// Return matchingIds directly for search results
		return matchingIds;
		}

		// --- [DND DEBUG 2] ---
		console.log(
			`[DND DEBUG 2] 'visibleItemIds' calculated. Visible items: ${visibleIds.size}`,
			visibleIds
		);
		return visibleIds;
	});

// PASTE THIS FUNCTION INTO YOUR ChatHistoryList.svelte

	async function handleDndFinalize(e: CustomEvent) {
		const newOrderedItems: DraggableItem[] = e.detail.items;

		// --- [DND DEBUG 3] ---
		console.log(
			`[DND DEBUG 3] 'handleDndFinalize' triggered. Received ${newOrderedItems.length} items from dnd-action.`,
			JSON.parse(JSON.stringify(newOrderedItems))
		);

		// ✅ THE DEFINITIVE FIX: Use the .update() method to mutate the stores in place.
		// This prevents Svelte from destroying and recreating the DOM nodes, which keeps
		// the dnd-action library's internal references valid.

		const newFolders: FolderCollection = {};
		const newChats: Chat[] = [];
		let currentFolderId: string | undefined = undefined;
		let folderOrder = 0;
		const originalChatsMap = new Map(validChats.map((c) => [c.id, c]));

		newOrderedItems.forEach((item) => {
			if (item.type === 'folder') {
				currentFolderId = item.id;
				newFolders[item.id] = { ...(item as Folder), order: folderOrder++ };
			} else if (item.type === 'chat') {
				const originalChat = originalChatsMap.get(item.id);
				if (originalChat) {
					newChats.push({ ...originalChat, folder: currentFolderId });
				} else {
					console.error(`[DND ERROR] Could not find original chat for ID: ${item.id}`);
				}
			}
		});

		// --- [DND DEBUG 4] ---
		console.log(`[DND DEBUG 4] Data constructed. About to update stores.`, {
			newFolders: JSON.parse(JSON.stringify(newFolders)),
			newChats: JSON.parse(JSON.stringify(newChats))
		});

		// Instead of folders.set(), we use folders.update().
		// We return the new object from the update function.
		folders.update(() => newFolders);

		// Instead of chats.set(), we use chats.update().
		// We return the new array from the update function.
		chats.update(() => newChats);

		// Wait for Svelte to process the state change and update the DOM
		await tick();
		console.log('[DND DEBUG 5] Stores have been updated and DOM should be settled.');
	}
</script>

<div
	class="w-full"
	use:dndzone={{ items: draggableItems, flipDurationMs: 150 }}
	onfinalize={handleDndFinalize}
>
	{#each draggableItems as item (item.id)}
		<!--
      VISUAL DEBUGGING:
      - Hidden items will be semi-transparent and have a dashed red border.
      - This allows you to SEE what the `visibleItemIds` logic is doing.
    -->
		<div
			animate:flip={{ duration: 150 }}
			class:hidden={!visibleItemIds.has(item.id)}
			class:opacity-30={!visibleItemIds.has(item.id)}
			class:border={!visibleItemIds.has(item.id)}
			class:border-dashed={!visibleItemIds.has(item.id)}
			class:border-red-500={!visibleItemIds.has(item.id)}
			class="transition-opacity duration-200"
		>
			{#if item.type === 'folder'}
				<ChatFolder folder={item} />
			{:else}
				{@const chatIndex = validChats.findIndex((c) => c.id === item.id)}
					{#if chatIndex > -1}
					<ChatHistory chat={item} index={chatIndex} />
				{/if}
			{/if}
		</div>
	{/each}
</div>