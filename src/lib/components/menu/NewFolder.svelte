<!-- File: src/lib/components/menu/NewFolder.svelte -->
<script lang="ts">
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import { app } from '$lib/state/app.svelte';
	import { toast } from '$lib/stores/toast.store.svelte';

	function addFolder() {
		app.createFolder('New Folder');
		toast.success('Folder created successfully');
	}
</script>

<button
	data-testid="new-folder-btn"
	class="flex items-center rounded-md transition-colors duration-200 text-sm text-base-content whitespace-nowrap hover:bg-base-content/10 px-2 py-2 gap-3 mb-2 border border-base-300 select-none cursor-pointer"
	onclick={addFolder}
>
	<NewFolderIcon />
	New Folder
</button>