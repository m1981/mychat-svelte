<!--src/routes/+layout.svelte-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeStores, isLoaded } from '$lib/stores/chat.store';
	import '../app.css';

	// Import layout components (adjust paths as needed)
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';

	// Initialize stores on mount (client-side only)
    onMount(async () => {
		console.log('🚀 Initializing application stores...');
            try {
                await initializeStores();
			console.log('✅ Application stores initialized successfully');
            } catch (error) {
			console.error('❌ Failed to initialize stores:', error);
      }
	});
</script>

<ErrorBoundary>
	{#if $isLoaded}
		<!-- App loaded - show normal layout -->
		<div class="app-container">
			<Sidebar />
			<div class="main-content">
				<Header />
		<Main>
					<slot />
		</Main>
	</div>
</div>
		<ToastContainer />
    {:else}
		<!-- Loading state while stores initialize from IndexedDB -->
		<div class="flex items-center justify-center h-screen bg-surface-50-950">
			<div class="text-center space-y-4">
				<div class="loading loading-spinner loading-lg text-primary"></div>
				<p class="text-surface-600-400 font-medium">Loading your conversations...</p>
            </div>
        </div>
    {/if}
</ErrorBoundary>