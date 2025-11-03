<script lang="ts">
	import { deleteHighlight } from '$lib/stores/highlight.store';
	import type { Highlight } from '$lib/types/chat';

	interface Props {
		highlights: Highlight[];
	}

	let { highlights }: Props = $props();

	async function handleDelete(id: string) {
		if (confirm('Delete this highlight?')) {
			await deleteHighlight(id);
		}
	}

	function scrollToHighlight(highlightId: string) {
		const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
		element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
</script>

<div class="highlights-list flex flex-col gap-3 h-full">
	<h3 class="text-sm font-semibold">Highlights</h3>

	{#if highlights.length === 0}
		<div class="text-sm text-base-content/50 text-center py-8">
			No highlights yet. Select text in messages to create highlights.
		</div>
	{:else}
		<div class="space-y-3 flex-1 overflow-y-auto">
			{#each highlights as highlight (highlight.id)}
				<div class="card bg-base-200 p-3 space-y-2">
					<div
						class="text-sm p-2 rounded cursor-pointer hover:opacity-80"
						style="background-color: {highlight.color || '#FFFF00'}"
						onclick={() => scrollToHighlight(highlight.id)}
						role="button"
						tabindex="0"
					>
						"{highlight.text}"
					</div>

					{#if highlight.note}
						<p class="text-xs text-base-content/70 italic">{highlight.note}</p>
					{/if}

					<div class="flex items-center justify-between text-xs">
						<span class="text-base-content/50">
							{new Date(highlight.createdAt).toLocaleDateString()}
						</span>
						<button
							class="btn btn-ghost btn-xs text-error"
							onclick={() => handleDelete(highlight.id)}
							title="Delete highlight"
						>
							🗑️
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
