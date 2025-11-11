<!-- src/lib/components/layout/Header.svelte -->
<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<header
	class="[grid-area:header] h-[60px] bg-surface-50-950 border-b border-surface-200-800 flex items-center justify-between px-4 relative"
>
	{@render children()}
</header>