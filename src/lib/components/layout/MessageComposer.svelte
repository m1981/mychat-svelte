<!-- File: src/lib/components/layout/MessageComposer.svelte -->
<script lang="ts">
	let {
		sendMessage,
		status
	}: {
		sendMessage: (msg: { text: string }) => void;
		status: string;
	} = $props();

	// We now manage the input state manually
	let input = $state('');

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();

		const isBusy = status === 'streaming' || status === 'submitted';
		if (!input.trim() || isBusy) return;

		// Send the message using the v5 format
		sendMessage({ text: input });
		input = '';
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-4xl mx-auto relative">
	<textarea
		data-testid="message-input"
		bind:value={input}
		disabled={status === 'streaming' || status === 'submitted'}
		rows="1"
		class="textarea textarea-bordered w-full pr-16 resize-none"
		placeholder="Type your message..."
		onkeydown={(e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		}}
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