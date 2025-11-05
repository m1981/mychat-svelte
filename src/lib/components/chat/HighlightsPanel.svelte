<script lang="ts">
	import { onMount } from 'svelte';
	import DeleteIcon from '$lib/components/icons/DeleteIcon.svelte';
	import ColorPaletteIcon from '$lib/components/icons/ColorPaletteIcon.svelte';

	interface Highlight {
		id: string;
		messageId: number;
		text: string;
		startOffset: number;
		endOffset: number;
		color: string;
		note?: string;
		createdAt: string;
	}

	interface Props {
		chatId: string;
		messageIds: number[];
	}

	let { chatId, messageIds }: Props = $props();
	let highlights = $state<Highlight[]>([]);
	let showColorPicker = $state<string | null>(null);

	const HIGHLIGHT_COLORS = [
		{ name: 'Yellow', value: '#FFFF00' },
		{ name: 'Green', value: '#90EE90' },
		{ name: 'Blue', value: '#87CEEB' },
		{ name: 'Pink', value: '#FFB6C1' },
		{ name: 'Orange', value: '#FFA500' },
		{ name: 'Purple', value: '#DDA0DD' }
	];

	async function loadHighlights() {
		try {
			// Load highlights for all messages in this chat
			const allHighlights: Highlight[] = [];
			for (const messageId of messageIds) {
				const response = await fetch(`/api/highlights?messageId=${messageId}`);
				if (response.ok) {
					const data = await response.json();
					allHighlights.push(...(data.data || []));
				}
			}
			highlights = allHighlights;
		} catch (error) {
			console.error('Failed to load highlights:', error);
		}
	}

	async function deleteHighlight(highlightId: string) {
		try {
			const response = await fetch(`/api/highlights/${highlightId}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				await loadHighlights();
			}
		} catch (error) {
			console.error('Failed to delete highlight:', error);
		}
	}

	async function changeColor(highlightId: string, color: string) {
		try {
			const response = await fetch(`/api/highlights/${highlightId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ color })
			});
			if (response.ok) {
				await loadHighlights();
				showColorPicker = null;
			}
		} catch (error) {
			console.error('Failed to change highlight color:', error);
		}
	}

	onMount(() => {
		loadHighlights();
	});

	// Reload highlights when messageIds change
	$effect(() => {
		if (messageIds.length > 0) {
			loadHighlights();
		}
	});
</script>

<div class="flex flex-col h-full">
	<div class="p-4 border-b">
		<h3 class="font-semibold">Highlights</h3>
	</div>

	<div class="flex-1 overflow-y-auto p-4" data-testid="highlights-list">
		{#if highlights.length === 0}
			<p class="text-center text-base-content/50">No highlights yet</p>
		{:else}
			{#each highlights as highlight}
				<div
					class="card bg-base-200 mb-3 relative"
					data-testid="highlight-item"
				>
					<div class="card-body p-3">
						<div class="flex items-start gap-3">
							<div
								class="w-4 h-4 rounded flex-shrink-0 mt-1"
								style="background-color: {highlight.color}"
							></div>
							<div class="flex-1">
								<p class="text-sm font-medium mb-1">{highlight.text}</p>
								{#if highlight.note}
									<p class="text-xs text-base-content/70">{highlight.note}</p>
								{/if}
							</div>
							<div class="flex gap-1">
								<div class="relative">
									<button
										class="btn btn-ghost btn-xs btn-square"
										onclick={() => showColorPicker = showColorPicker === highlight.id ? null : highlight.id}
										aria-label="Change color"
										data-testid="color-picker"
									>
										<ColorPaletteIcon class="w-4 h-4" />
									</button>
									{#if showColorPicker === highlight.id}
										<div class="absolute right-0 z-10 mt-1 p-2 bg-base-100 rounded-lg shadow-lg border">
											<div class="grid grid-cols-3 gap-2">
												{#each HIGHLIGHT_COLORS as color}
													<button
														class="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
														style="background-color: {color.value}"
														onclick={() => changeColor(highlight.id, color.value)}
														aria-label={color.name}
														role="button"
													></button>
												{/each}
											</div>
										</div>
									{/if}
								</div>
								<button
									class="btn btn-ghost btn-xs btn-square"
									onclick={() => deleteHighlight(highlight.id)}
									aria-label="Delete highlight"
									data-testid="delete-highlight"
								>
									<DeleteIcon class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
