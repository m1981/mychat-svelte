<script lang="ts">
	import { app } from '$lib/state/app.svelte';

	// Since highlights are loaded per-chat via loadChatKnowledge, app.highlights is already filtered
	const highlights = $derived(app.highlights);
</script>

<div class="flex flex-col gap-3">
	{#if highlights.length === 0}
		<p class="text-sm text-base-content/50 text-center mt-8">
			Select text in an AI response to save highlights.
		</p>
	{:else}
		{#each highlights as highlight (highlight.id)}
			<div
				data-testid="highlight-item"
				class="bg-yellow-50 border border-yellow-200 rounded-md p-3 relative group"
			>
				<p class="text-sm text-base-content pr-4">{highlight.text}</p>
				<button
					class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-base-content/30 hover:text-error text-xs transition-opacity"
					onclick={() => app.deleteHighlight(highlight.id)}
					title="Remove highlight"
				>&#x2715;</button>
			</div>
		{/each}
	{/if}
</div>
