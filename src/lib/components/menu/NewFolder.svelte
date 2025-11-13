<!-- src/lib/components/menu/NewFolder.svelte -->
<script lang="ts">
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import { generating, createFolder } from '$lib/stores/chat.store';
	import { toast } from '$lib/stores/toast.store';
	import { tick } from 'svelte';

	let isCreating = $state(false);

	/**
	 * Creates a new folder with local-first approach
	 * - Saves to IndexedDB immediately
	 * - Updates UI optimistically
	 * - Syncs to server in background
	 */
	async function addFolder() {
		if ($generating || isCreating) return;

		isCreating = true;

		try {
			// Create folder using enhanced store (local-first)
			const newFolder = await createFolder({
				name: 'Untitled Folder',
				type: 'STANDARD',
				color: '#3b82f6'
			});

			toast.success('Folder created', { duration: 2000 });
			console.log(`✅ Created new folder: ${newFolder.id}`);

			// Auto-trigger rename mode after creation
			await tick();
			const folderElement = document.querySelector(`[data-folder-id="${newFolder.id}"]`);
			if (folderElement) {
				const editButton = folderElement.querySelector('[title="Edit folder name"]');
				if (editButton instanceof HTMLElement) {
					editButton.click();
				}
			}
		} catch (error) {
			console.error('Failed to create folder:', error);
			toast.error('Failed to create folder. Please try again.');
		} finally {
			isCreating = false;
		}
	}
</script>

<button
	class="flex items-center rounded-md transition-colors duration-200 text-sm text-base-content whitespace-nowrap hover:bg-base-content/10 px-2 py-2 gap-3 mb-2 border border-base-300 select-none"
	class:cursor-not-allowed={$generating || isCreating}
	class:opacity-40={$generating || isCreating}
	class:cursor-pointer={!$generating && !isCreating}
	class:opacity-100={!$generating && !isCreating}
	disabled={$generating || isCreating}
	onclick={addFolder}
	aria-label="Create new folder"
>
	{#if isCreating}
		<span class="loading loading-spinner loading-sm"></span>
	{:else}
		<NewFolderIcon />
	{/if}
	New Folder
</button>