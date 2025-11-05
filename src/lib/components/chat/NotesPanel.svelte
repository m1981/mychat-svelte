<script lang="ts">
	import { onMount } from 'svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';

	interface Note {
		id: string;
		chatId: string;
		messageId?: number;
		type: 'SCRATCH' | 'SUMMARY' | 'TODO';
		content: string;
		createdAt: string;
		updatedAt: string;
	}

	interface Props {
		chatId: string;
	}

	let { chatId }: Props = $props();
	let notes = $state<Note[]>([]);
	let isEditing = $state(false);
	let editingContent = $state('');
	let editingType = $state<'SCRATCH' | 'SUMMARY' | 'TODO'>('SCRATCH');
	let editingNoteId = $state<string | null>(null);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

	async function loadNotes() {
		try {
			const response = await fetch(`/api/notes?chatId=${chatId}`);
			if (response.ok) {
				const data = await response.json();
				notes = data.data || [];
			}
		} catch (error) {
			console.error('Failed to load notes:', error);
		}
	}

	async function createNote() {
		isEditing = true;
		editingContent = '';
		editingType = 'SCRATCH';
		editingNoteId = null;
	}

	async function saveNote() {
		if (!editingContent.trim()) return;

		try {
			if (editingNoteId) {
				// Update existing note
				const response = await fetch(`/api/notes/${editingNoteId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: editingContent,
						type: editingType
					})
				});
				if (response.ok) {
					await loadNotes();
				}
			} else {
				// Create new note
				const response = await fetch('/api/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chatId,
						content: editingContent,
						type: editingType
					})
				});
				if (response.ok) {
					await loadNotes();
				}
			}
			isEditing = false;
			editingContent = '';
			editingNoteId = null;
		} catch (error) {
			console.error('Failed to save note:', error);
		}
	}

	function editNote(note: Note) {
		isEditing = true;
		editingContent = note.content;
		editingType = note.type;
		editingNoteId = note.id;
	}

	async function deleteNote(noteId: string) {
		try {
			const response = await fetch(`/api/notes/${noteId}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				await loadNotes();
			}
		} catch (error) {
			console.error('Failed to delete note:', error);
		}
	}

	function handleInput() {
		// Auto-save after 1 second of no typing
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}
		autoSaveTimer = setTimeout(() => {
			if (editingContent.trim() && editingNoteId) {
				saveNote();
			}
		}, 1000);
	}

	onMount(() => {
		loadNotes();
	});
</script>

<div class="flex flex-col h-full">
	<div class="p-4 border-b flex justify-between items-center">
		<h3 class="font-semibold">Notes</h3>
		<button
			class="btn btn-sm btn-primary"
			onclick={createNote}
			aria-label="Add note"
		>
			+ Add Note
		</button>
	</div>

	<div class="flex-1 overflow-y-auto p-4" data-testid="notes-list">
		{#if notes.length === 0 && !isEditing}
			<p class="text-center text-base-content/50">No notes yet</p>
		{:else}
			{#each notes as note}
				<div class="card bg-base-200 mb-3" data-testid="note-item">
					<div class="card-body p-3">
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<div class="badge badge-sm mb-2">{note.type}</div>
								<p class="text-sm whitespace-pre-wrap">{note.content}</p>
							</div>
							<div class="flex gap-1">
								<button
									class="btn btn-ghost btn-xs btn-square"
									onclick={() => editNote(note)}
									aria-label="Edit note"
									data-testid="edit-note"
								>
									<EditIcon class="w-4 h-4" />
								</button>
								<button
									class="btn btn-ghost btn-xs btn-square"
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
				<span class="label-text mb-2 block">Note Type</span>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm"
						class:btn-primary={editingType === 'SCRATCH'}
						onclick={() => (editingType = 'SCRATCH')}
					>
						SCRATCH
					</button>
					<button
						type="button"
						class="btn btn-sm"
						class:btn-primary={editingType === 'SUMMARY'}
						onclick={() => (editingType = 'SUMMARY')}
					>
						SUMMARY
					</button>
					<button
						type="button"
						class="btn btn-sm"
						class:btn-primary={editingType === 'TODO'}
						onclick={() => (editingType = 'TODO')}
					>
						TODO
					</button>
				</div>
			</div>
			<textarea
				bind:value={editingContent}
				oninput={handleInput}
				class="textarea textarea-bordered w-full"
				placeholder="Write your note..."
				rows="4"
				data-testid="note-editor"
			></textarea>
			<div class="flex gap-2 mt-2">
				<button
					class="btn btn-sm btn-primary"
					onclick={saveNote}
					disabled={!editingContent.trim()}
					aria-label="Save"
				>
					Save
				</button>
				<button
					class="btn btn-sm"
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
