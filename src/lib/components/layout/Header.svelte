<!-- src/lib/components/layout/Header.svelte - FIXED -->
<script lang="ts">
	interface Props {
		children?: any;  // Make children optional
	}

	let { children }: Props = $props();
</script>

<header class="header-container">
	<div class="header-content">
		{#if children}
			{@render children()}
		{:else}
			<!-- Default header content if no children passed -->
			<div class="text-surface-600-400">
				BetterChatGPT
			</div>
		{/if}
	</div>
</header>

<style>
	.header-container {
		display: flex;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-surface-300);
		background-color: var(--color-surface-100);
	}

	:global(.dark) .header-container {
		border-bottom-color: var(--color-surface-700);
		background-color: var(--color-surface-900);
	}

	.header-content {
		flex: 1;
	}
</style>