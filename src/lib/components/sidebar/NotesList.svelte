<script lang="ts">
	import { createNote, updateNote, deleteNote } from '$lib/stores/note.store';
	import type { Note } from '$lib/types/chat';

	interface Props {
		notes: Note[];
		chatId?: string;
	}

	let { notes, chatId }: Props = $props();

	let editingNoteId = $state<string | null>(null);
	let editContent = $state('');
	let newNoteContent = $state('');
	let newNoteType = $state<'SCRATCH' | 'SUMMARY' | 'TODO'>('SCRATCH');
	let showAddNote = $state(false);

	function startEdit(note: Note) {
		editingNoteId = note.id;
		editContent = note.content;
	}

	function cancelEdit() {
		editingNoteId = null;
		editContent = '';
	}

	async function saveEdit(note: Note) {
		if (!editContent.trim()) return;

		await updateNote({
			id: note.id,
			content: editContent.trim()
		});

		cancelEdit();
	}

	async function handleDelete(noteId: string) {
		if (confirm('Are you sure you want to delete this note?')) {
			await deleteNote(noteId);
		}
	}

	async function handleAddNote() {
		if (!newNoteContent.trim() || !chatId) return;

		await createNote({
			chatId,
			content: newNoteContent.trim(),
			type: newNoteType
		});

		newNoteContent = '';
		showAddNote = false;
	}

	function getNoteTypeColor(type: string): string {
		switch (type) {
			case 'SUMMARY':
				return 'badge-info';
			case 'TODO':
				return 'badge-warning';
			default:
				return 'badge-ghost';
		}
	}
</script>

<div class="notes-list flex flex-col gap-3 h-full">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold">Notes</h3>
		{#if chatId}
			<button
				class="btn btn-xs btn-ghost"
				onclick={() => (showAddNote = !showAddNote)}
				title="Add note"
			>
				{showAddNote ? '✕' : '+'}
			</button>
		{/if}
	</div>

	<!-- Add Note Form -->
	{#if showAddNote && chatId}
		<div class="card bg-base-200 p-3 space-y-2">
			<select bind:value={newNoteType} class="select select-xs">
				<option value="SCRATCH">Scratch</option>
				<option value="SUMMARY">Summary</option>
				<option value="TODO">TODO</option>
			</select>
			<textarea
				bind:value={newNoteContent}
				class="textarea textarea-bordered textarea-sm w-full"
				placeholder="Write your note..."
				rows="3"
			></textarea>
			<div class="flex gap-2">
				<button class="btn btn-primary btn-xs" onclick={handleAddNote}>Add</button>
				<button class="btn btn-ghost btn-xs" onclick={() => (showAddNote = false)}>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<!-- Notes List -->
	{#if notes.length === 0}
		<div class="text-sm text-base-content/50 text-center py-8">No notes yet</div>
	{:else}
		<div class="space-y-3 flex-1 overflow-y-auto">
			{#each notes as note (note.id)}
				<div class="card bg-base-200 p-3 space-y-2">
					<!-- Note Type Badge -->
					<div class="flex items-center justify-between">
						<span class="badge badge-sm {getNoteTypeColor(note.type)}">{note.type}</span>
						<div class="text-xs text-base-content/50">
							{new Date(note.createdAt).toLocaleDateString()}
						</div>
					</div>

					<!-- Note Content -->
					{#if editingNoteId === note.id}
						<textarea
							bind:value={editContent}
							class="textarea textarea-bordered textarea-sm w-full"
							rows="3"
						></textarea>
						<div class="flex gap-2">
							<button class="btn btn-primary btn-xs" onclick={() => saveEdit(note)}>
								Save
							</button>
							<button class="btn btn-ghost btn-xs" onclick={cancelEdit}>Cancel</button>
						</div>
					{:else}
						<p class="text-sm whitespace-pre-wrap">{note.content}</p>
						<div class="flex gap-2 justify-end">
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => startEdit(note)}
								title="Edit note"
							>
								✏️
							</button>
							<button
								class="btn btn-ghost btn-xs text-error"
								onclick={() => handleDelete(note.id)}
								title="Delete note"
							>
								🗑️
							</button>
						</div>
					{/if}

					<!-- Tags -->
					{#if note.tags && note.tags.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each note.tags as tag}
								<span class="badge badge-xs" style="background-color: {tag.color || '#gray'}">
									{tag.name}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.notes-list {
		max-height: 100%;
	}
</style>
