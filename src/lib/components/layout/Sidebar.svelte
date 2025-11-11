<!-- src/lib/components/layout/Sidebar.svelte -->
<script lang="ts">
	let { isVisible, children }: { isVisible: boolean; children: import('svelte').Snippet } = $props();
</script>

<aside
	class="[grid-area:sidebar] bg-surface-100-900 border-r border-surface-200-800 flex flex-col overflow-hidden"
	class:opacity-100={isVisible}
	class:w-0={!isVisible}
	class:opacity-0={!isVisible}
	style:width={isVisible ? 'var(--layout-sidebar-width)' : '0px'}
>
	{#if isVisible}
		{@render children()}
	{/if}
</aside>