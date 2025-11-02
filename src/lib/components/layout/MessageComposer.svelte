<script lang="ts">
	import { chats, generating, currentChatIndex } from '$lib/stores/chat.store';
	import { get } from 'svelte/store';
	import { handleError } from '$lib/utils/error-handler';

	let prompt = $state('');

	// 1. MODIFY THE FUNCTION SIGNATURE to accept the event object.
	async function handleSubmit(event: SubmitEvent) {
		// 2. MANUALLY PREVENT THE DEFAULT BEHAVIOR. This is the crucial step.
		event.preventDefault();

		const currentPrompt = prompt.trim();
		if (!currentPrompt || $generating) return;

		prompt = ''; // Clear input immediately

		// ... rest of the function is correct and remains unchanged ...
		const allChats = get(chats);
		const currentIndex = get(currentChatIndex);
		const currentChat = allChats[currentIndex];

		if (!currentChat) {
			handleError(new Error('No active chat selected.'));
			return;
		}

		currentChat.messages.push({ role: 'user', content: currentPrompt });
		chats.set(allChats);

		generating.set(true);

		const assistantMessage = { role: 'assistant', content: '' };
		currentChat.messages.push(assistantMessage);
		chats.set(allChats);

		try {
			const response = await fetch('/api/chat/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentChat)
			});

			if (!response.ok || !response.body) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to get response stream.');
			}

			const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const lines = value.split('\n').filter((line) => line.trim() !== '');
				for (const line of lines) {
					const chunk = JSON.parse(line);
					if (chunk.type === 'chunk') {
						assistantMessage.content += chunk.content;
						chats.set(get(chats));
					}
				}
			}
		} catch (error) {
			handleError(error, 'Failed to generate response.');
			assistantMessage.content = 'Sorry, an error occurred. Please try again.';
		} finally {
			generating.set(false);
			chats.set(get(chats));
		}
	}
</script>

<!-- 3. MODIFY THE TEMPLATE to use the correct Svelte 5 event syntax. -->
<form onsubmit={handleSubmit} class="w-full max-w-4xl mx-auto">
	<div class="relative">
		<textarea
			bind:value={prompt}
			disabled={$generating}
			rows="1"
			class="textarea textarea-bordered w-full pr-16 resize-none"
			placeholder="Type your message..."
			onkeydown={(e) => {
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					// We can call handleSubmit directly here.
					// We need to cast the event type because onkeydown provides a KeyboardEvent,
					// but handleSubmit expects a SubmitEvent. For this specific case,
					// creating a synthetic event or refactoring is cleaner.
					// Let's simplify by just calling the function.
					handleSubmit(new SubmitEvent('submit', { cancelable: true }));
				}
			}}
		></textarea>
		<button
			type="submit"
			class="btn btn-primary btn-square absolute bottom-2 right-2"
			disabled={!prompt.trim() || $generating}
			aria-label="Send message"
		>
			{#if $generating}
				<span class="loading loading-spinner"></span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
			{/if}
		</button>
	</div>
</form>