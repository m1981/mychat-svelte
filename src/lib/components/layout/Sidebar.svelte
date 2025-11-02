<!-- src/lib/components/layout/Sidebar.svelte -->
<script lang="ts">
	let { isVisible, children }: { isVisible: boolean; children: import('svelte').Snippet } = $props();
</script>

<aside
	class="[grid-area:sidebar] bg-base-200 border-r border-base-300 flex flex-col overflow-hidden"
	class:opacity-100={isVisible}
	class:w-0={!isVisible}
	class:opacity-0={!isVisible}
	style:width={isVisible ? 'var(--layout-sidebar-width)' : '0px'}
>
	{#if isVisible}
		{@render children()}
	{/if}
</aside>