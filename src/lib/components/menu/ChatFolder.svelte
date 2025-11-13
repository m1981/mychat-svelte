<!-- src/lib/components/menu/ChatFolder.svelte -->
<script lang="ts">
	import type { Chat, Folder } from '$lib/types/chat';
	import ChatHistory from './ChatHistory.svelte';
	import FolderIcon from '$lib/components/icons/FolderIcon.svelte';
	import NewChat from './NewChat.svelte';
	import ColorPaletteIcon from '$lib/components/icons/ColorPaletteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import ArchiveIcon from '$lib/components/icons/ArchiveIcon.svelte';
	import ColorPicker from '$lib/components/ui/ColorPicker.svelte';
	import { folders, updateFolder, deleteFolder, restoreFolder } from '$lib/stores/chat.store';
	import { toast } from '$lib/stores/toast.store';
	import { tick } from 'svelte';

	let {
		folder,
		folderChats,
		chats
	}: {
		folder: Folder;
		folderChats: Chat[];
		chats: Chat[];
	} = $props();

	let hovered = $state(false);
	let isRenaming = $state(false);
	let editedName = $state(folder.name);
	let inputElement: HTMLInputElement | undefined = $state();
	let isDeleting = $state(false);
	let isColorPickerOpen = $state(false);
	let selectedColor = $state(folder.color || '');

	function toggleExpanded() {
		folders.update((allFolders) => {
			if (allFolders[folder.id]) {
				allFolders[folder.id].expanded = !allFolders[folder.id].expanded;
			}
			return allFolders;
		});
	}

	async function startRename(e: Event) {
		e.stopPropagation();
		isRenaming = true;
		editedName = folder.name;

		// Focus manually after DOM update
		await tick();
		inputElement?.focus();
		inputElement?.select();
	}

	async function handleRename() {
		if (!editedName.trim()) {
			toast.warning('Folder name cannot be empty');
			editedName = folder.name;
			isRenaming = false;
			return;
		}

		if (editedName.trim() === folder.name) {
			isRenaming = false;
			return;
		}

		try {
			// Use enhanced store function (local-first)
			await updateFolder(folder.id, { name: editedName.trim() });

			toast.success('Folder renamed successfully', {
				duration: 2000
			});

			console.log(`✅ Renamed folder ${folder.id} to: ${editedName}`);
		} catch (error) {
			console.error('Failed to rename folder:', error);
			toast.error('Failed to rename folder');
			editedName = folder.name;
		}

		isRenaming = false;
	}

	function cancelRename() {
		isRenaming = false;
		editedName = folder.name;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleRename();
		} else if (e.key === 'Escape') {
			cancelRename();
		}
	}

	async function handleDelete(e: Event) {
		e.stopPropagation();

		// Show confirmation dialog
		const chatCount = folderChats.length;
		const message = chatCount > 0
			? `Delete "${folder.name}" and move ${chatCount} chat${chatCount !== 1 ? 's' : ''} to the root level?`
			: `Delete "${folder.name}"?`;

		if (!confirm(message)) {
			return;
		}

		isDeleting = true;

		try {
			// Use enhanced store function (local-first)
			await deleteFolder(folder.id);

			toast.success('Folder deleted successfully', {
				duration: 2000
			});

			console.log(`✅ Deleted folder: ${folder.id}`);
		} catch (error) {
			console.error('Failed to delete folder:', error);
			toast.error('Failed to delete folder');
		}

		isDeleting = false;
	}

	function openColorPicker(e: Event) {
		e.stopPropagation();
		isColorPickerOpen = true;
	}

	async function handleColorChange(newColor: string) {
		try {
			// Use enhanced store function (local-first)
			await updateFolder(folder.id, { color: newColor || undefined });

			selectedColor = newColor;

			toast.success('Folder color updated successfully', {
				duration: 2000
			});

			console.log(`✅ Updated folder ${folder.id} color to: ${newColor || 'none'}`);
		} catch (error) {
			console.error('Failed to update folder color:', error);
			toast.error('Failed to update folder color');
		}
	}

	async function handleDelete(e: Event) {
		e.stopPropagation();
		const chatCount = folderChats.length;
		// MODIFIED: Updated confirmation message for soft delete
		const message = `Move "${folder.name}" to the trash?` +
			(chatCount > 0 ? ` ${chatCount} chat${chatCount !== 1 ? 's' : ''} inside will be moved to the root.` : '');

		if (!confirm(message)) return;

		isDeleting = true;
		try {
			// MODIFIED: Call soft delete (default)
			await deleteFolder(folder.id);
			toast.success('Folder moved to trash', { duration: 2000 });
		} catch (error) {
			console.error('Failed to delete folder:', error);
			toast.error('Failed to delete folder');
		}
		isDeleting = false;
	}
</script>

<div class="chat-folder" data-folder-id={folder.id}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="folder-header"
		class:folder-header--normal={!folder.color}
		class:folder-header--colored={folder.color}
		style:background-color={hovered && folder.color ? `${folder.color}dd` : folder.color}
		style:color={folder.color ? 'var(--color-primary-content)' : ''}
		onclick={isRenaming ? null : toggleExpanded}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
	>
		<div class="folder-icon-container">
			<FolderIcon />
		</div>
		<div class="folder-name-container">
			{#if isRenaming}
				<input
					type="text"
					bind:value={editedName}
					bind:this={inputElement}
					onkeydown={handleKeydown}
					onblur={handleRename}
					class="folder-rename-input"
					onclick={(e) => e.stopPropagation()}
				/>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="folder-name-text"
					ondblclick={startRename}
				>
					{folder.name}
				</span>
			{/if}
			{#if !hovered && !isRenaming}
			<div
					class="folder-gradient"
					style:background={folder.color
						? `linear-gradient(to left, ${folder.color}, transparent)`
						: ''}
			></div>
			{/if}
		</div>
		<div class="folder-actions" onclick={(e) => e.stopPropagation()}>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 2;"
				title="Change folder color"
				onclick={openColorPicker}
			>
				<ColorPaletteIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 1;"
				title="Edit folder name"
				onclick={startRename}
			>
				<EditIcon />
			</button>
			<button
				class="folder-action-btn"
				class:btn-visible={hovered}
				style="--button-index: 0;"
				title="Move to trash"
				onclick={handleDelete}
				disabled={isDeleting}
			>
				{#if isDeleting}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<DeleteIcon />
				{/if}
			</button>
		</div>
	</div>

	{#if folder.expanded}
		<div class="folder-content">
			<NewChat folder={folder.id} showOnHover={hovered} />
			<div class="folder-droppable-area">
				{#each folderChats as chat (chat.id)}
					{@const chatIndex = chats.findIndex((c) => c.id === chat.id)}
					<ChatHistory {chat} index={chatIndex} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<ColorPicker bind:isOpen={isColorPickerOpen} bind:selectedColor onColorSelect={handleColorChange} />

<style>
	.folder-rename-input {
		width: 100%;
		background: transparent;
		border: 1px solid currentColor;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
		outline: none;
	}

	.folder-rename-input:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
	}
</style>