<!-- src/lib/components/menu/ChatHistoryList.svelte -->
<script lang="ts">
	import { chats, folders } from '$lib/stores/chat.store';
	import type { Chat, Folder, FolderCollection } from '$lib/types/chat';
	import ChatFolder from './ChatFolder.svelte';
	import ChatHistory from './ChatHistory.svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	let { searchFilter }: { searchFilter: string } = $props();

	const allChats = $chats;
	const allFolders = $folders;

	// ✅ FIX: Define `validChats` as its own top-level derived value.
	// It is now reactive and available to all subsequent computations in this scope.
	const validChats = $derived(allChats.filter(Boolean));

	type DraggableItem = (Chat & { type: 'chat' }) | (Folder & { type: 'folder' });
	type RenderableFolder = Folder & { chats: Chat[] };
	type RenderableItem = RenderableFolder | Chat;

	// This list is ONLY for the dndzone. It must be flat and complete.
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

		return items;
	});

	// ✅ THE DEFINITIVE FIX: Create a structured, pre-filtered list for rendering.
	// The template will now be extremely simple and safe.
	const renderableItems = $derived.by(() => {
		const searchTerm = searchFilter.toLowerCase();
		const sortedFolders = Object.values(allFolders).sort((a, b) => a.order - b.order);
		const validChats = allChats.filter(Boolean); // Safety filter

		if (!searchTerm) {
			// No filter: return all folders with their chats, and all unorganized chats.
			const foldersWithChats: RenderableFolder[] = sortedFolders.map((folder) => ({
				...folder,
				chats: validChats.filter((c) => c.folder === folder.id)
			}));
			const unorganizedChats = validChats.filter((chat) => !chat.folder);
			return [...foldersWithChats, ...unorganizedChats];
		}

		const finalItems: RenderableItem[] = [];

		// Process folders
		sortedFolders.forEach((folder) => {
			const matchingChatsInFolder = validChats.filter(
				(chat) =>
					chat.folder === folder.id &&
					typeof chat.title === 'string' && // Defensive check
					chat.title.toLowerCase().includes(searchTerm)
	);

			// Check if the folder name itself matches
			const folderNameMatches = folder.name.toLowerCase().includes(searchTerm);

			if (folderNameMatches) {
				// If folder name matches, include the folder and ALL its chats
				finalItems.push({
					...folder,
					chats: validChats.filter((c) => c.folder === folder.id)
				});
			} else if (matchingChatsInFolder.length > 0) {
				// If only chats match, include the folder but ONLY with the matching chats
				finalItems.push({
					...folder,
					chats: matchingChatsInFolder
				});
			}
		});
		const matchingUnorganizedChats = validChats.filter(
			(chat) =>
				!chat.folder &&
				typeof chat.title === 'string' && // Defensive check
				chat.title.toLowerCase().includes(searchTerm)
		);
		finalItems.push(...matchingUnorganizedChats);

		// --- DEBUG STEP 2: Log the final list that will be rendered ---
		console.log('[DEBUG 2] Final `renderableItems`:', JSON.parse(JSON.stringify(finalItems)));
		return finalItems;
	});

	function handleDndFinalize(e: CustomEvent) {
		const newOrderedItems: DraggableItem[] = e.detail.items;

		const newFolders: FolderCollection = {};
		const newChats: Chat[] = [];

		let currentFolderId: string | undefined = undefined;
		let folderOrder = 0;

		// Use the reactive `validChats` here as well for consistency.
		const originalChatsMap = new Map(validChats.map((c) => [c.id, c]));

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
            // ✅ DEFINITIVE FIX: Look up the original, complete chat object.
            const originalChat = originalChatsMap.get(item.id);

            // Only proceed if we found a valid, original chat object.
            if (originalChat) {
				newChats.push({
						...originalChat,
						folder: currentFolderId
				});
            } else {
					console.warn(`[DND-WARN] Could not find original chat data for item ID: ${item.id}. Skipping.`);
			}
			}
		});

		// --- DEBUG STEP 4: Log the data just before updating the store ---
		console.log('[DEBUG 4] Data before setting store in handleDndFinalize:', { newFolders, newChats });
		if (newChats.some(c => !c)) {
			console.error('[CRITICAL] `newChats` in handleDndFinalize contains null/undefined entries!', newChats);
		}

		folders.set(newFolders);
		chats.set(newChats);
	}
</script>

<div
	class="w-full"
	use:dndzone={{ items: draggableItems, flipDurationMs: 150 }}
	on:finalize={handleDndFinalize}
>
	<!-- ✅ The render loop is now simple and safe -->
	{#each renderableItems as item (item.id)}
		<div animate:flip={{ duration: 150 }}>
			<!-- Check if the item is a folder by looking for the `chats` array we added -->
			{#if 'chats' in item}
				{@const folder = item as RenderableFolder}
				<ChatFolder {folder}>
					<!-- Simply iterate over the pre-filtered chats for this folder -->
					{#each folder.chats as chat (chat.id)}
						{@const chatIndex = validChats.findIndex((c) => c.id === chat.id)}
							{#if chatIndex > -1}
						<ChatHistory {chat} index={chatIndex} />
						{/if}
					{/each}
				</ChatFolder>
			{:else}
				<!-- This can only be a valid, unorganized chat -->
				{@const chat = item as Chat}
				{@const chatIndex = validChats.findIndex((c) => c.id === chat.id)}
					{#if chatIndex > -1}
				<ChatHistory {chat} index={chatIndex} />
				{/if}
			{/if}
		</div>
	{/each}
</div>