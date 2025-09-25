<script lang="ts">
	import NewFolderIcon from '$lib/components/icons/NewFolderIcon.svelte';
	import { generating } from '$lib/stores/chat.store';

	function addFolder() {
		if ($generating) return;
		// TODO: Implement folder creation logic
		console.log('Creating new folder');
	}
</script>

<button
	class="flex items-center rounded-md transition-colors duration-200 text-sm text-base-content whitespace-nowrap hover:bg-base-content/10 px-2 py-2 gap-3 mb-2 border border-base-300 select-none"
	class:cursor-not-allowed={$generating}
	class:opacity-40={$generating}
	class:cursor-pointer={!$generating}
	class:opacity-100={!$generating}
	disabled={$generating}
	on:click={addFolder}
>
	<NewFolderIcon /> New Folder
</button>