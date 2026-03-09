<!-- File: src/lib/components/layout/MessageComposer.svelte -->
<script lang="ts">
	import { app } from '$lib/state/app.svelte';

	let {
		sendMessage,
		status
	}: {
		sendMessage: (msg: { text: string }) => void;
		status: string;
	} = $props();

	let input = $state('');

	// @mention state
	let mentionQuery = $state('');
	let mentionStart = $state(-1);
	let showMentionDropdown = $derived(mentionStart !== -1 && mentionQuery.length >= 0);

	const mentionMatches = $derived(
		showMentionDropdown
			? app.chats
					.filter((c) => c.title.toLowerCase().includes(mentionQuery.toLowerCase()))
					.slice(0, 6)
			: []
	);

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const val = target.value;
		const cursor = target.selectionStart ?? val.length;

		// Find last '@' before cursor with no space after it
		const textBeforeCursor = val.slice(0, cursor);
		const atIndex = textBeforeCursor.lastIndexOf('@');
		if (atIndex !== -1) {
			const afterAt = textBeforeCursor.slice(atIndex + 1);
			if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
				mentionStart = atIndex;
				mentionQuery = afterAt;
				return;
			}
		}
		mentionStart = -1;
		mentionQuery = '';
	}

	function selectMention(chatTitle: string) {
		const before = input.slice(0, mentionStart);
		const after = input.slice(mentionStart + 1 + mentionQuery.length);
		input = `${before}@${chatTitle}${after}`;
		mentionStart = -1;
		mentionQuery = '';
	}

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();

		const isBusy = status === 'streaming' || status === 'submitted';
		if (!input.trim() || isBusy) return;

		sendMessage({ text: input });
		input = '';
		mentionStart = -1;
		mentionQuery = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && mentionStart !== -1) {
			e.preventDefault();
			mentionStart = -1;
			mentionQuery = '';
			return;
		}
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (showMentionDropdown && mentionMatches.length > 0) {
				selectMention(mentionMatches[0].title);
			} else {
				handleSubmit();
			}
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-4xl mx-auto relative">
	{#if showMentionDropdown && mentionMatches.length > 0}
		<div
			data-testid="mention-dropdown"
			class="absolute bottom-full left-0 mb-1 w-64 bg-base-200 border border-base-300 rounded-lg shadow-lg z-50 overflow-hidden"
		>
			{#each mentionMatches as chat}
				<button
					type="button"
					data-testid="mention-option"
					class="w-full text-left px-3 py-2 text-sm hover:bg-base-300 transition-colors truncate"
					onclick={() => selectMention(chat.title)}
				>
					{chat.title}
				</button>
			{/each}
		</div>
	{/if}

	<textarea
		data-testid="message-input"
		bind:value={input}
		disabled={status === 'streaming' || status === 'submitted'}
		rows="1"
		class="textarea textarea-bordered w-full pr-16 resize-none"
		placeholder="Type your message… (@ to mention a chat)"
		oninput={handleInput}
		onkeydown={handleKeydown}
	></textarea>

	<button
		data-testid="send-btn"
		type="submit"
		class="btn btn-primary btn-square absolute bottom-2 right-2"
		disabled={!input.trim() || status === 'streaming' || status === 'submitted'}
		aria-label="Send message"
	>
		{#if status === 'streaming' || status === 'submitted'}
			<span class="loading loading-spinner"></span>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
			</svg>
		{/if}
	</button>
</form>
