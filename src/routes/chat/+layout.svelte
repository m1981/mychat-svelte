<!-- src/routes/chat/+layout.svelte -->
<script lang="ts">
	// No context setup is needed here anymore.
	// Global initialization, if required, should happen in the root layout
	// and use the rune-based store's initialize function.
  let { children } = $props();
</script>

{@render children()}