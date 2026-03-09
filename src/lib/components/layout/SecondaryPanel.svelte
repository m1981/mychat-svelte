<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import NotesTab from '$lib/components/secondary/NotesTab.svelte';
	import HighlightsTab from '$lib/components/secondary/HighlightsTab.svelte';
	import SearchTab from '$lib/components/secondary/SearchTab.svelte';
</script>

{#if app.secondaryPanelTab !== 'closed'}
	<div
		data-testid="secondary-panel"
		class="w-72 border-l border-base-300 bg-base-100 flex flex-col h-full overflow-hidden"
		style="grid-area: secondary"
	>
		<!-- Tab bar -->
		<div class="flex border-b border-base-300 shrink-0">
			<button
				class="flex-1 py-2 text-sm font-medium transition-colors {app.secondaryPanelTab === 'notes'
					? 'text-primary border-b-2 border-primary'
					: 'text-base-content/50'}"
				onclick={() => (app.secondaryPanelTab = 'notes')}
			>
				Notes
			</button>
			<button
				class="flex-1 py-2 text-sm font-medium transition-colors {app.secondaryPanelTab ===
				'highlights'
					? 'text-primary border-b-2 border-primary'
					: 'text-base-content/50'}"
				onclick={() => (app.secondaryPanelTab = 'highlights')}
			>
				Highlights
			</button>
			<button
				class="flex-1 py-2 text-sm font-medium transition-colors {app.secondaryPanelTab === 'search'
					? 'text-primary border-b-2 border-primary'
					: 'text-base-content/50'}"
				onclick={() => (app.secondaryPanelTab = 'search')}
			>
				Search
			</button>
			<button
				class="px-3 py-2 text-base-content/50 hover:text-base-content"
				onclick={() => (app.secondaryPanelTab = 'closed')}
				title="Close panel"
			>&#x2715;</button>
		</div>

		<!-- Tab content -->
		<div class="flex-1 overflow-y-auto p-3">
			{#if app.secondaryPanelTab === 'notes'}
				<NotesTab />
			{:else if app.secondaryPanelTab === 'highlights'}
				<HighlightsTab />
			{:else if app.secondaryPanelTab === 'search'}
				<SearchTab />
			{/if}
		</div>
	</div>
{/if}
