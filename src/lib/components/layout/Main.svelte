<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="[grid-area:content] flex flex-col overflow-hidden h-full">
	<main class="flex-1 bg-base-100 overflow-auto relative">
		{@render children()}
	</main>
</div>