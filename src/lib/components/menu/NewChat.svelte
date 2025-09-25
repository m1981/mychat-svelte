<script lang="ts">
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import { generating } from '$lib/stores/chat.store';

	let { folder, showOnHover = false }: { folder?: string; showOnHover?: boolean } = $props();
	let hovered = $state(false);

	function addChat() {
		if ($generating) return;
		// TODO: Implement chat creation logic
		console.log('Creating new chat in folder:', folder);
	}
</script>

{#if folder}
<button
		class="new-chat-btn new-chat-btn--folder"
	class:new-chat-btn--normal={!$generating}
	class:new-chat-btn--disabled={$generating}
	disabled={$generating}
	on:click={addChat}
		on:mouseenter={() => (hovered = true)}
		on:mouseleave={() => (hovered = false)}
	aria-label="New Chat"
>
		<div
			class="new-chat-folder-content"
			class:new-chat-folder-content--visible={showOnHover || hovered}
			class:new-chat-folder-content--hidden={!showOnHover && !hovered}
		>
			<PlusIcon /> New Chat
		</div>
	</button>
	{:else}
	<button
		class="new-chat-btn new-chat-btn--standalone"
		class:new-chat-btn--normal={!$generating}
		class:new-chat-btn--disabled={$generating}
		disabled={$generating}
		on:click={addChat}
		aria-label="New Chat"
	>
		<PlusIcon />
		New Chat
	</button>
	{/if}