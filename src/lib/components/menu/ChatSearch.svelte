<!-- src/lib/components/menu/ChatSearch.svelte -->
<script lang="ts">
	import { generating } from '$lib/stores/chat.store';
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';

	let { filter }: { filter: string } = $props();
</script>

<div class="relative h-8 mb-2">
	<input
		disabled={$generating}
		type="text"
		class="text-base-content p-3 text-sm bg-base-100 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity m-0 w-full h-full focus:outline-none rounded border border-base-300"
		placeholder="Search"
		bind:value={filter}
	/>
	{#if filter && !$generating}
		<button
			class="btn btn-ghost btn-xs btn-circle"
			onclick={() => (filter = '')}
			aria-label="Clear search"
			style:position="absolute"
			style:right="0.5rem"
			style:top="50%"
			style:transform="translateY(-50%)"
		>
			<CrossIcon />
		</button>
	{/if}
</div>