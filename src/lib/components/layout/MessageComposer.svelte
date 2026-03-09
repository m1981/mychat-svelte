<!-- File: src/lib/components/layout/MessageComposer.svelte -->
<script lang="ts">
	import { app } from '$lib/state/app.svelte';

	let {
		sendMessage,
		status,
		onStop
	}: {
		sendMessage: (msg: { text: string }) => void;
		status: string;
		onStop?: () => void;
	} = $props();

	let input = $state('');
	let isDraggingOver = $state(false);

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

	const isStreaming = $derived(status === 'streaming' || status === 'submitted');

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const val = target.value;
		const cursor = target.selectionStart ?? val.length;

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
		if (!input.trim() || isStreaming) return;
		sendMessage({ text: input });
		input = '';
		mentionStart = -1;
		mentionQuery = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		// Escape closes mention dropdown
		if (e.key === 'Escape' && mentionStart !== -1) {
			e.preventDefault();
			mentionStart = -1;
			mentionQuery = '';
			return;
		}

		// Enter: submit or select first mention
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (showMentionDropdown && mentionMatches.length > 0) {
				selectMention(mentionMatches[0].title);
			} else {
				handleSubmit();
			}
			return;
		}

		// Cmd/Ctrl+Enter: always submit (even when dropdown is open)
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSubmit();
		}
	}

	// File drop handling
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = true;
	}

	function handleDragLeave() {
		isDraggingOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = false;
		const file = e.dataTransfer?.files[0];
		if (!file) return;
		const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt');
		if (!isText) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const content = ev.target?.result as string;
			input += `\n\n--- File: ${file.name} ---\n${content}\n---\n`;
		};
		reader.readAsText(file);
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
		disabled={isStreaming}
		rows="1"
		class="textarea textarea-bordered w-full pr-16 resize-none transition-colors {isDraggingOver ? 'border-primary bg-primary/5' : ''}"
		placeholder="Type your message… (@ to mention a chat)"
		oninput={handleInput}
		onkeydown={handleKeydown}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	></textarea>

	{#if isStreaming}
		<button
			data-testid="stop-btn"
			type="button"
			class="btn btn-error btn-square absolute bottom-2 right-2"
			onclick={onStop}
			aria-label="Stop generation"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<rect x="6" y="6" width="12" height="12" rx="1" />
			</svg>
		</button>
	{:else}
		<button
			data-testid="send-btn"
			type="submit"
			class="btn btn-primary btn-square absolute bottom-2 right-2"
			disabled={!input.trim()}
			aria-label="Send message"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
			</svg>
		</button>
	{/if}
</form>
