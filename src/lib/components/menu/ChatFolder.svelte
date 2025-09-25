<!-- src/lib/components/menu/ChatFolder.svelte -->
<script lang="ts">
	import type { Folder } from '$lib/types/chat';
	import FolderIcon from '$lib/components/icons/FolderIcon.svelte';
	import NewChat from './NewChat.svelte';
	import ColorPaletteIcon from '$lib/components/icons/ColorPaletteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import { folders } from '$lib/stores/chat.store';

	let { folder }: { folder: Folder } = $props();

	let hovered = $state(false);

	function toggleExpanded() {
		folders.update((allFolders) => {
			if (allFolders[folder.id]) {
			allFolders[folder.id].expanded = !allFolders[folder.id].expanded;
			}
			return allFolders;
		});
	}
</script>

<div class="chat-folder">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="folder-header"
		class:folder-header--normal={!folder.color}
		class:folder-header--colored={folder.color}
		style:background-color={hovered && folder.color ? `${folder.color}dd` : folder.color}
		style:color={folder.color ? 'var(--color-primary-content)' : ''}
		on:click={toggleExpanded}
		on:mouseenter={() => (hovered = true)}
		on:mouseleave={() => (hovered = false)}
	>
		<div class="folder-icon-container">
			<FolderIcon />
		</div>
		<div class="folder-name-container">
			<span class="folder-name-text">{folder.name}</span>
			{#if !hovered}
			<div
					class="folder-gradient"
					style:background={folder.color
						? `linear-gradient(to left, ${folder.color}, transparent)`
						: ''}
			></div>
			{/if}
		</div>
		<div class="folder-actions" on:click|stopPropagation>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 2;"
				title="Change folder color"
			>
				<ColorPaletteIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 1;"
				title="Edit folder name"
			>
				<EditIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 0;"
				title="Delete folder"
			>
				<DeleteIcon />
			</button>
		</div>
	</div>

	{#if folder.expanded}
		<div class="folder-content">
			<NewChat folder={folder.id} showOnHover={hovered} />
			<div class="folder-droppable-area">
				<!-- ✅ YIELD CONTROL: Let the parent render the content here -->
				<slot />
			</div>
		</div>
	{/if}
</div>