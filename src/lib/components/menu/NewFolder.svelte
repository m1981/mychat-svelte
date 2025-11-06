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
				// Call API to create folder
				const response = await fetch('/api/folders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Untitled Folder',
						type: 'STANDARD',
						color: '#3b82f6' // Default blue color
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to create folder');
				}

				// Get the created folder from the API response
				const createdFolder: Folder = await response.json();

				// Add the new folder to the store
				folders.update((currentFolders: FolderCollection) => {
					return {
						...currentFolders,
						[createdFolder.id]: createdFolder
					};
				});

				// Show success toast
				toast.success('Folder created successfully', {
					duration: 2000
				});

				console.log(`✅ Created new folder: ${createdFolder.id}`);

				// Auto-trigger rename mode after creation
				await tick(); // Wait for DOM to update
				const folderElement = document.querySelector(`[data-folder-id="${createdFolder.id}"]`);
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