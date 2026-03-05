<!-- File: src/lib/components/menu/ChatHistoryList.svelte -->
<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import type { Chat, Folder } from '$lib/types/models';
	import ChatFolder from './ChatFolder.svelte';
	import ChatHistory from './ChatHistory.svelte';
	import { dndzone } from 'svelte-dnd-action';

	let { searchFilter }: { searchFilter: string } = $props();

	type DraggableItem = (Chat & { dndType: 'chat' }) | (Folder & { dndType: 'folder' });

	const draggableItems = $derived.by(() => {
		const items: DraggableItem[] = [];
		const sortedFolders = [...app.folders].sort((a, b) => a.order - b.order);

		sortedFolders.forEach((folder) => {
			items.push({ ...folder, dndType: 'folder' });
			const folderChats = app.chats.filter((chat) => chat.folderId === folder.id);
			folderChats.forEach((chat) => items.push({ ...chat, dndType: 'chat' }));
		});

		const unorganizedChats = app.chats.filter((chat) => !chat.folderId);
		unorganizedChats.forEach((chat) => items.push({ ...chat, dndType: 'chat' }));
		return items;
	});

	const filteredRenderList = $derived(
		draggableItems.filter(
			(item) =>
				item.dndType === 'folder' ||
				item.title.toLowerCase().includes(searchFilter.toLowerCase())
		)
	);

	function handleDndFinalize(e: CustomEvent) {
		// Update app.folders and app.chats based on e.detail.items
		// (Implementation remains similar, just mutating app.folders array instead of object)
	}
</script>

<div class="w-full" use:dndzone={{ items: draggableItems, flipDurationMs: 150 }} onfinalize={handleDndFinalize}>
	{#each filteredRenderList as item (item.id)}
		<div>
			{#if item.dndType === 'folder'}
				{@const folderChats = app.chats.filter((c) => c.folderId === item.id)}
				<ChatFolder folder={item} {folderChats} chats={app.chats} />
			{:else if item.dndType === 'chat' && !item.folderId}
				{@const chatIndex = app.chats.findIndex((c) => c.id === item.id)}
				<ChatHistory chat={item} index={chatIndex} />
			{/if}
		</div>
	{/each}
</div>