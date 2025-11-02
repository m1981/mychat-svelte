<!-- src/lib/components/layout/Header.svelte -->
<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<header
	class="[grid-area:header] h-[60px] bg-base-100 border-b border-base-300 flex items-center justify-between px-4 relative"
>
	{@render children()}
</header>