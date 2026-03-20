<script lang="ts">
	import { app } from '$lib/state/app.svelte';

	// eslint-disable-next-line svelte/prefer-writable-derived -- textarea needs two-way binding; $state + $effect is correct here
	let content = $state(app.notes.find((n) => n.chatId === app.activeChatId)?.content ?? '');
	let saveTimer: ReturnType<typeof setTimeout>;

	// Sync when note loads or active chat changes
	$effect(() => {
		content = app.notes.find((n) => n.chatId === app.activeChatId)?.content ?? '';
	});

	function onInput() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			if (app.activeChatId) {
				app.saveNote(app.activeChatId, content);
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
