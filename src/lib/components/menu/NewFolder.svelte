<!-- src/lib/components/menu/NewFolder.svelte -->
<script lang="ts">
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import { folders, generating } from '$lib/stores/chat.store';
	import type { Folder, FolderCollection } from '$lib/types/chat';

	/**
	 * Creates a new folder with default configuration
	 */
	function addFolder() {
		if ($generating) return;

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

		console.log(`✅ Created new folder: ${folderId} with order ${newFolder.order}`);

		// Optional: Trigger rename mode after creation
		// You can emit an event or use a store to signal the folder should enter edit mode
		setTimeout(() => {
			// Find the folder element and trigger edit mode
			const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
			if (folderElement) {
				const editButton = folderElement.querySelector('[title="Edit folder name"]');
				if (editButton instanceof HTMLElement) {
					editButton.click();
				}
			}
		}, 100);
	}
</script>

<button
	class="flex items-center rounded-md transition-colors duration-200 text-sm text-base-content whitespace-nowrap hover:bg-base-content/10 px-2 py-2 gap-3 mb-2 border border-base-300 select-none"
	class:cursor-not-allowed={$generating}
	class:opacity-40={$generating}
	class:cursor-pointer={!$generating}
	class:opacity-100={!$generating}
	disabled={$generating}
	onclick={addFolder}
	aria-label="Create new folder"
>
	<NewFolderIcon /> New Folder
</button>