<!-- src/lib/components/menu/ChatSearch.svelte -->
<script lang="ts">
	import CrossIcon from '$lib/components/icons/CrossIcon.svelte';
	let { filter = $bindable('') }: { filter: string } = $props();
</script>

<div class="relative h-8 mb-2">
	<input
		type="text"
		class="text-base-content p-3 text-sm bg-base-100 transition-opacity m-0 w-full h-full focus:outline-none rounded border border-base-300"
		placeholder="Search"
		bind:value={filter}
	/>
	{#if filter}
		<button
			class="btn btn-ghost btn-xs btn-circle absolute right-2 top-1/2 -translate-y-1/2"
			onclick={() => (filter = '')}
		>
			<CrossIcon />
		</button>
	{/if}
</div>