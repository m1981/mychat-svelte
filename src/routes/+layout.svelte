<!--src/routes/+layout.svelte-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initializeStores, isLoaded } from '$lib/stores/chat.store';
	import '../app.css';

	// Import layout components (adjust paths as needed)
	import SyncStatus from '$lib/components/SyncStatus.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';

	// Initialize stores on mount (client-side only)
    onMount(async () => {
		console.log('📍 Layout onMount fired');
		console.log('🚀 Initializing application stores...');
            try {
                await initializeStores();
			console.log('✅ Application stores initialized successfully');
			console.log('📍 After init, isLoaded =', $isLoaded);
            } catch (error) {
			console.error('❌ Failed to initialize stores:', error);
			console.log('📍 After error, isLoaded =', $isLoaded);
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
		<SyncStatus />
    {:else}
		<!-- Loading state while stores initialize from IndexedDB -->
		<div class="loading-container">
			<div class="loading-content">
				<div class="loading loading-spinner loading-lg text-primary"></div>
				<p class="loading-text">Loading your conversations...</p>
            </div>
        </div>
    {/if}
</ErrorBoundary>

<style>
	.app-container {
		display: flex;
		height: 100vh;
		overflow: hidden;
		background-color: var(--color-surface-50);
	}

	:global(.dark) .app-container {
		background-color: var(--color-surface-950);
	}

	.main-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.loading-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background-color: var(--color-surface-50);
	}

	:global(.dark) .loading-container {
		background-color: var(--color-surface-950);
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-text {
		color: var(--color-surface-600);
		font-weight: 500;
	}

	:global(.dark) .loading-text {
		color: var(--color-surface-400);
	}
</style>
