<!-- src/lib/components/menu/NewFolder.svelte -->
<script lang="ts">
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import { folders, generating } from '$lib/stores/chat.store';
	import { toast } from '$lib/stores/toast.store';
	import { withErrorHandling } from '$lib/utils/error-handler';
	import { tick } from 'svelte';
	import type { Folder, FolderCollection } from '$lib/types/chat';

	let isCreating = $state(false);

	/**
	 * Creates a new folder with default configuration
	 */
	async function addFolder() {
		if ($generating || isCreating) return;

		isCreating = true;

		await withErrorHandling(
			async () => {
		// Generate unique ID using timestamp + random string
		const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		// Determine the next order number (highest current order + 1)
		const currentFolders = $folders;
		const maxOrder = Object.values(currentFolders).reduce(
			(max, folder) => Math.max(max, folder.order),
			-1
		);

		// Create new folder object
		const newFolder: Folder = {
			id: folderId,
			name: 'New Folder',
			expanded: true, // Start expanded so user can see it
			order: maxOrder + 1,
			color: '#3b82f6' // Default blue color
		};

		// Add the new folder to the store
		folders.update((currentFolders: FolderCollection) => {
			return {
				...currentFolders,
				[folderId]: newFolder
			};
		});

				// Show success toast
				toast.success('Folder created successfully', {
					duration: 2000
				});

		console.log(`✅ Created new folder: ${folderId} with order ${newFolder.order}`);

				// Auto-trigger rename mode after creation
				await tick(); // Wait for DOM to update
			const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
			if (folderElement) {
				const editButton = folderElement.querySelector('[title="Edit folder name"]');
				if (editButton instanceof HTMLElement) {
					editButton.click();
				}
			}
			},
			{
				errorMessage: 'Failed to create folder. Please try again.',
				showToast: true
			}
		);

		isCreating = false;
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