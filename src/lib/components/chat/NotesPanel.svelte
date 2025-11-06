<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import { offlineFetcher } from '$lib/services/offline-fetcher';
	import { notes as noteStore } from '$lib/stores/note.store.enhanced'; // Direct store (SSR-safe)
	import type { Note, CreateNoteDTO } from '$lib/types/note';

	interface Props {
		chatId: string;
	}

	let { chatId }: Props = $props();

	// Fixed: Derive directly from store (valid subscribe-able input)
	// $derived(noteStore) subscribes to noteStore; $notes is reactive value
	const notes = $derived(noteStore);

	// Debug: Client-only effect to log context/store state (SSR-safe: no logs)
	$effect(() => {
		if (browser) {
	const chatStores = getContext<{ notes: Note[] }>('chatStores');
		if (chatStores) {
				console.log('NotesPanel: Context available (length:', chatStores.notes?.length || 0, '); using derived store');
			} else {
				console.log('NotesPanel: No context; using direct store (length:', $notes.length, ')');
		}
		}
		// SSR: Derivation runs silently; log not needed (server console separate)
	});

	let isEditing = $state(false);
	let editingContent = $state('');
	let editingType = $state<'SCRATCH' | 'SUMMARY' | 'TODO'>('SCRATCH');
	let editingNoteId = $state<string | null>(null);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

	async function loadNotes() {
		console.log('NotesPanel: Loading notes for chat', chatId, '- current length:', $notes.length);
		// Trigger load via store method (local-first); derived reacts
		if ('loadByChatId' in noteStore) await (noteStore as any).loadByChatId(chatId);
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
				await offlineFetcher.updateNote(editingNoteId, {
						content: editingContent,
						type: editingType
				});
			} else {
				await offlineFetcher.createNote({
						chatId,
						content: editingContent,
						type: editingType
				});
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
			await offlineFetcher.deleteNote(noteId);
		} catch (error) {
			console.error('Failed to delete note:', error);
		}
	}

	function handleInput() {
		if (autoSaveTimer) clearTimeout(autoSaveTimer);
		autoSaveTimer = setTimeout(() => {
			if (editingContent.trim() && editingNoteId) saveNote();
		}, 1000);
	}

	onMount(() => {
		console.log('NotesPanel: Mounted - initial notes length:', $notes.length);
		loadNotes();
	});
</script>

<div class="flex flex-col h-full">
	<div class="p-4 border-b flex justify-between items-center">
		<h3 class="font-semibold">Notes ({$notes.length})</h3>
		<button
			class="btn btn-sm btn-primary"
			onclick={createNote}
			aria-label="Add note"
		>
			+ Add Note
		</button>
	</div>

	<div class="flex-1 overflow-y-auto p-4" data-testid="notes-list">
		{#if $notes.length === 0 && !isEditing}
			<p class="text-center text-base-content/50">No notes yet</p>
		{:else}
			{#each $notes as note}
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
