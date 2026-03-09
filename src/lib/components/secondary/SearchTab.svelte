<!-- File: src/lib/components/secondary/SearchTab.svelte -->
<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';

	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const query = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => app.search(query), 400);
	}

	function navigateToMessage(chatId: string) {
		goto(`/chat/${chatId}`);
	}
</script>

<div class="flex flex-col gap-3">
	<input
		data-testid="search-input"
		type="text"
		class="input input-bordered input-sm w-full"
		placeholder="Search messages…"
		value={app.searchQuery}
		oninput={handleInput}
	/>

	{#if app.searchResults.length === 0 && app.searchQuery.trim()}
		<p class="text-sm text-base-content/50 text-center mt-4">No results found</p>
	{/if}

	{#each app.searchResults as result}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			data-testid="search-result"
			class="card card-compact bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
			onclick={() => navigateToMessage(result.chatId)}
			onkeydown={(e) => e.key === 'Enter' && navigateToMessage(result.chatId)}
			role="button"
			tabindex="0"
		>
			<div class="card-body gap-1">
				<p class="text-xs font-semibold text-primary truncate">{result.chatTitle}</p>
				<p class="text-sm text-base-content/80 line-clamp-3">{result.content}</p>
				<p class="text-xs text-base-content/40 capitalize">{result.role}</p>
			</div>
		</div>
	{/each}
</div>
