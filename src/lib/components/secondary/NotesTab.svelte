<script lang="ts">
	import { app } from '$lib/state/app.svelte';

	// eslint-disable-next-line svelte/prefer-writable-derived -- textarea needs two-way binding; $state + $effect is correct here
	let content = $state(app.notes.find((n) => n.chatId === app.activeChatId)?.content ?? '');
	let isDirty = $state(false);
	let saveTimer: ReturnType<typeof setTimeout>;

	// Plain variable (not $state) so writing it inside $effect doesn't trigger a re-run.
	let lastSyncedChatId: string | null = null;

	// Sync content from notes, but never overwrite unsaved user edits.
	// When the active chat changes we always re-sync (and clear the dirty flag).
	$effect(() => {
		const chatId = app.activeChatId;
		const noteContent = app.notes.find((n) => n.chatId === chatId)?.content ?? '';

		if (chatId !== lastSyncedChatId) {
			// Navigated to a different chat – always reload and mark clean.
			isDirty = false;
			lastSyncedChatId = chatId;
			content = noteContent;
		} else if (!isDirty) {
			// Same chat, notes just loaded/updated and user hasn't edited – safe to sync.
			content = noteContent;
		}
		// If isDirty === true and same chat, leave content alone so the debounce
		// saves what the user actually typed, not the stale server value.
	});

	function onInput() {
		isDirty = true;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			if (app.activeChatId) {
				await app.saveNote(app.activeChatId, content);
				isDirty = false; // allow future note loads to sync without clobbering
			}
		}, 1000);
	}
</script>

<div class="flex flex-col h-full gap-2">
	<p class="text-xs text-base-content/50">Auto-saves after 1 second</p>
	<textarea
		data-testid="notes-textarea"
		class="textarea textarea-bordered w-full flex-1 min-h-48 resize-none text-sm"
		placeholder="Write notes about this chat..."
		bind:value={content}
		oninput={onInput}
	></textarea>
</div>
