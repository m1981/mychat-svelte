<!--src/routes/+layout.svelte-->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
    import SyncStatus from '$lib/components/SyncStatus.svelte';
	import { hideSideMenu } from '$lib/stores/ui.store';
	import { chats, folders, currentChatIndex } from '$lib/stores/chat.store';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { eventBus } from '$lib/events/eventBus'; // New: For top-level event handling

    // Import local-first functionality
    import { initializeStores, isLoaded } from '$lib/stores/chat.store.enhanced';

	let { children, data } = $props(); // Get data from the server load function

    // Local-first initialization flag
    let localFirstInitialized = $state(false);

    onMount(async () => {
        if (browser) {
            try {
                // Initialize local-first stores (IndexedDB + Sync Service)
                console.log('🚀 Initializing local-first stores...');
                await initializeStores();
                localFirstInitialized = true;
                console.log('✅ Local-first stores initialized');
            } catch (error) {
                console.error('❌ Failed to initialize local-first stores:', error);
                // Fall back to server-side data
                localFirstInitialized = true; // Still mark as initialized to show UI
            }

            // New: Top-level event handlers (e.g., for analytics, logging side effects)
            // Keeps components dumb - they just call store methods
            const handleNoteCreated = (e: CustomEvent) => {
                console.log('Analytics: Note created', e.detail); // e.g., send to analytics service
            };

            const handleNoteUpdated = (e: CustomEvent) => {
                console.log('Analytics: Note updated', e.detail);
            };

            const handleNoteDeleted = (e: CustomEvent) => {
                console.log('Analytics: Note deleted', e.detail);
            };

            // Similar for highlights and attachments...
            const handleHighlightCreated = (e: CustomEvent) => {
                console.log('Analytics: Highlight created', e.detail);
            };

            eventBus.addEventListener('note:created', handleNoteCreated);
            eventBus.addEventListener('note:updated', handleNoteUpdated);
            eventBus.addEventListener('note:deleted', handleNoteDeleted);
            eventBus.addEventListener('highlight:created', handleHighlightCreated);

            // Cleanup on unmount
            return () => {
                eventBus.removeEventListener('note:created', handleNoteCreated);
                eventBus.removeEventListener('note:updated', handleNoteUpdated);
                eventBus.removeEventListener('note:deleted', handleNoteDeleted);
                eventBus.removeEventListener('highlight:created', handleHighlightCreated);
            };
        }
    });

    // Initialize stores immediately with server-side data (server-side rendering)
    // This ensures the app works even before IndexedDB loads
	chats.set(data.chats || []);
	folders.set(data.folders || {});

	// Update stores when data changes (e.g., navigation)
    // This maintains backward compatibility with server-side updates
	$effect(() => {
        // Only update from server if local-first hasn't initialized yet
        // Once local-first is active, it manages the store
        if (!localFirstInitialized) {
		chats.set(data.chats || []);
		folders.set(data.folders || {});
        }
	});

	// Sync currentChatIndex with the URL
	$effect(() => {
		const chatId = $page.params.id;
		if (chatId && $chats.length > 0) {
			const index = $chats.findIndex(c => c.id === chatId);
			if (index > -1) {
				currentChatIndex.set(index);
			}
		}
	});

	let isTransitioning = $state(false);

	$effect(() => {
		const isHidden = $hideSideMenu;
			isTransitioning = true;
		const timer = setTimeout(() => {
				isTransitioning = false;
			}, 300);

		return () => {
			clearTimeout(timer);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>BetterChatGPT</title>
</svelte:head>

<!-- Global Toast Container -->
<ToastContainer position="top-right" />

<!-- Sync Status Indicator (bottom-right) -->
{#if browser && localFirstInitialized && $isLoaded}
    <SyncStatus />
{/if}

<!-- Main App with Error Boundary -->
<ErrorBoundary>
    {#if !browser || localFirstInitialized}
        <!-- Show app once local-first is initialized or in SSR mode -->
<div
	class="w-full h-screen flex justify-center bg-base-300"
	style="padding: var(--layout-container-padding)"
>
	<div
		class="w-full h-full grid shadow-xl rounded-md overflow-hidden grid-rows-[var(--layout-header-height)_1fr] grid-cols-[auto_1fr]"
		class:transition-all={isTransitioning}
		class:duration-300={isTransitioning}
		class:ease-in-out={isTransitioning}
		style:max-width="var(--layout-app-max-width)"
		style:grid-template-areas={`
      "sidebar header"
      "sidebar content"
    `}
	>
		<Sidebar isVisible={!$hideSideMenu}>
				<!-- Wrap Menu in its own error boundary so sidebar errors don't crash the whole app -->
				<ErrorBoundary
					showToast={false}
					logErrors={true}
				>
					<Menu />
				</ErrorBoundary>
		</Sidebar>

		<Header>
			<div class="text-base-content/50">Header Content</div>
		</Header>

		<Main>
				<!-- Wrap main content in error boundary -->
				<ErrorBoundary>
			{@render children()}
				</ErrorBoundary>
		</Main>
	</div>
</div>
    {:else}
        <!-- Loading state while initializing local-first -->
        <div class="w-full h-screen flex items-center justify-center bg-base-300">
            <div class="text-center">
                <div class="loading loading-spinner loading-lg mb-4"></div>
                <p class="text-base-content/70">Initializing local storage...</p>
            </div>
        </div>
    {/if}
</ErrorBoundary>