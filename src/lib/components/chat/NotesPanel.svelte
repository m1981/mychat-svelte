<!-- src/lib/components/chat/NotesPanel.svelte -->
<script lang="ts">
	import { createNoteManager } from '$lib/stores/note.store';
	import type { Note } from '$lib/types/note';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';

	let { chatId }: { chatId: string } = $props();

	// ✅ Create a scoped, reactive note manager for this specific chat.
	// It will automatically load its own data.
	const noteManager = createNoteManager(chatId);
	const notes = $derived(noteManager.notes);

	let isEditing = $state(false);
	let editingContent = $state('');
	let editingType = $state<'SCRATCH' | 'SUMMARY' | 'TODO'>('SCRATCH');
	let editingNoteId = $state<string | null>(null);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

	function createNote() {
		isEditing = true;
		editingContent = '';
		editingType = 'SCRATCH';
		editingNoteId = null;
	}

	async function saveNote() {
		if (!editingContent.trim()) return;

			if (editingNoteId) {
			await noteManager.update(editingNoteId, {
						content: editingContent,
						type: editingType
				});
			} else {
			// ✅ chatId is handled by the manager
			await noteManager.create({
						content: editingContent,
						type: editingType
				});
			}
			isEditing = false;
			editingContent = '';
			editingNoteId = null;
	}

	function editNote(note: Note) {
		isEditing = true;
		editingContent = note.content;
		editingType = note.type;
		editingNoteId = note.id;
	}

	async function deleteNote(noteId: string) {
		if (confirm('Are you sure you want to delete this note?')) {
			await noteManager.delete(noteId);
		}
	}

	function handleInput() {
		if (autoSaveTimer) clearTimeout(autoSaveTimer);
		autoSaveTimer = setTimeout(() => {
			if (editingContent.trim() && editingNoteId) saveNote();
		}, 1000);
	}
</script>

<div class="flex flex-col h-full">
	<div class="p-4 border-b flex justify-between items-center">
		<h3 class="font-semibold">Notes ({notes.length})</h3>
		<button
			class="btn btn-sm btn-filled-primary"
			onclick={createNote}
			aria-label="Add note"
		>
			+ Add Note
		</button>
	</div>

	<div class="flex-1 overflow-y-auto p-4" data-testid="notes-list">
		{#if !noteManager.isLoaded}
			<p class="text-center text-base-content/50">Loading notes...</p>
		{:else if notes.length === 0 && !isEditing}
			<p class="text-center text-base-content/50">No notes yet</p>
		{:else}
			{#each notes as note (note.id)}
				<div class="card bg-base-200 mb-3" data-testid="note-item">
					<div class="card-body p-3">
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<div class="badge badge-sm mb-2 bg-primary text-primary-content">{note.type}</div>
								<p class="text-sm whitespace-pre-wrap">{note.content}</p>
							</div>
							<div class="flex gap-1">
								<button
									class="btn btn-ghost btn-xs btn-icon"
									onclick={() => editNote(note)}
									aria-label="Edit note"
									data-testid="edit-note"
								>
									<EditIcon class="w-4 h-4" />
								</button>
								<button
									class="btn btn-ghost btn-xs btn-icon"
									onclick={() => deleteNote(note.id)}
									aria-label="Delete note"
									data-testid="delete-note"
								>
									<DeleteIcon class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if isEditing}
		<div class="border-t p-4">
			<div class="mb-3">
				<label class="block text-sm font-medium mb-2">Note Type</label>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm"
						class:btn-filled-primary={editingType === 'SCRATCH'}
						class:btn-ghost={editingType !== 'SCRATCH'}
						onclick={() => (editingType = 'SCRATCH')}
					>
						SCRATCH
					</button>
					<button
						type="button"
						class="btn btn-sm"
						class:btn-filled-primary={editingType === 'SUMMARY'}
						class:btn-ghost={editingType !== 'SUMMARY'}
						onclick={() => (editingType = 'SUMMARY')}
					>
						SUMMARY
					</button>
					<button
						type="button"
						class="btn btn-sm"
						class:btn-filled-primary={editingType === 'TODO'}
						class:btn-ghost={editingType !== 'TODO'}
						onclick={() => (editingType = 'TODO')}
					>
						TODO
					</button>
				</div>
			</div>
			<textarea
				bind:value={editingContent}
				oninput={handleInput}
				class="textarea w-full border border-base-300 rounded p-2"
				placeholder="Write your note..."
				rows="4"
				data-testid="note-editor"
			></textarea>
			<div class="flex gap-2 mt-2">
				<button
					class="btn btn-sm btn-filled-primary"
					onclick={saveNote}
					disabled={!editingContent.trim()}
					aria-label="Save"
				>
					Save
				</button>
				<button
					class="btn btn-sm btn-ghost"
					onclick={() => {
						isEditing = false;
						editingContent = '';
						editingNoteId = null;
					}}
					aria-label="Cancel"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>
