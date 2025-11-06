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
	import { folders } from '$lib/stores/chat.store';
	import { toast } from '$lib/stores/toast.store';
	import { withErrorHandling } from '$lib/utils/error-handler';
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
	let isArchiving = $state(false);

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

		await withErrorHandling(
			async () => {
				// Call API to update folder name
				const response = await fetch(`/api/folders/${folder.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: editedName.trim() })
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to rename folder');
				}

				// Update local store
				folders.update((allFolders) => {
					if (allFolders[folder.id]) {
						allFolders[folder.id] = {
							...allFolders[folder.id],
							name: editedName.trim()
						};
					}
					return { ...allFolders };
				});

				toast.success('Folder renamed successfully', {
					duration: 2000
				});

				console.log(`✅ Renamed folder ${folder.id} to: ${editedName}`);
			},
			{
				errorMessage: 'Failed to rename folder',
				showToast: true
			}
		);

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

		await withErrorHandling(
			async () => {
				// Call API to delete folder (with cascade to move chats to root)
				const response = await fetch(`/api/folders/${folder.id}?cascade=true`, {
					method: 'DELETE'
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to delete folder');
				}

				// Remove folder from local store
				folders.update((allFolders) => {
					const updated = { ...allFolders };
					delete updated[folder.id];
					return updated;
				});

				toast.success('Folder deleted successfully', {
					duration: 2000
				});

				console.log(`✅ Deleted folder: ${folder.id}`);
			},
			{
				errorMessage: 'Failed to delete folder',
				showToast: true
			}
		);

		isDeleting = false;
	}

	function openColorPicker(e: Event) {
		e.stopPropagation();
		isColorPickerOpen = true;
	}

	async function handleColorChange(newColor: string) {
		await withErrorHandling(
			async () => {
				// Call API to update folder color
				const response = await fetch(`/api/folders/${folder.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ color: newColor || null })
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to update folder color');
				}

				// Update local store
				folders.update((allFolders) => {
					if (allFolders[folder.id]) {
						allFolders[folder.id] = {
							...allFolders[folder.id],
							color: newColor || undefined
						};
					}
					return { ...allFolders };
				});

				selectedColor = newColor;

				toast.success('Folder color updated successfully', {
					duration: 2000
				});

				console.log(`✅ Updated folder ${folder.id} color to: ${newColor || 'none'}`);
			},
			{
				errorMessage: 'Failed to update folder color',
				showToast: true
			}
		);
	}

	async function handleArchive(e: Event) {
		e.stopPropagation();

		const isCurrentlyArchived = folder.type === 'ARCHIVE';
		const newType = isCurrentlyArchived ? 'STANDARD' : 'ARCHIVE';
		const action = isCurrentlyArchived ? 'Unarchive' : 'Archive';

		// Show confirmation dialog
		const chatCount = folderChats.length;
		const message = chatCount > 0
			? `${action} "${folder.name}" and ${chatCount} chat${chatCount !== 1 ? 's' : ''}?`
			: `${action} "${folder.name}"?`;

		if (!confirm(message)) {
			return;
		}

		isArchiving = true;

		await withErrorHandling(
			async () => {
				// Call API to update folder type
				const response = await fetch(`/api/folders/${folder.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type: newType })
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || `Failed to ${action.toLowerCase()} folder`);
				}

				// Update local store
				folders.update((allFolders) => {
					if (allFolders[folder.id]) {
						allFolders[folder.id] = {
							...allFolders[folder.id],
							type: newType
						};
					}
					return { ...allFolders };
				});

				toast.success(`Folder ${action.toLowerCase()}d successfully`, {
					duration: 2000
				});

				console.log(`✅ ${action}d folder: ${folder.id}`);
			},
			{
				errorMessage: `Failed to ${action.toLowerCase()} folder`,
				showToast: true
			}
		);

		isArchiving = false;
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
				style="--button-index: 3;"
				title={folder.type === 'ARCHIVE' ? 'Unarchive folder' : 'Archive folder'}
				onclick={handleArchive}
				disabled={isArchiving}
			>
				{#if isArchiving}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<ArchiveIcon />
				{/if}
			</button>
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
				title="Delete folder"
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