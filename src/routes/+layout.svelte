<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { hideSideMenu } from '$lib/stores/ui.store';
    // --- ADD THESE IMPORTS ---
	import { chats, folders, currentChatIndex } from '$lib/stores/chat.store';
	import { page } from '$app/stores';

	let { children, data } = $props(); // Get data from the server load function

	// --- Initialize stores with server-side data ---
	// This runs ONLY ONCE when the component is created.
	$effect(() => {
		chats.set(data.chats || []);
		folders.set(data.folders || {});
	});
	// --- Sync currentChatIndex with the URL ---
	$effect(() => {
		const chatId = $page.params.id;
		if (chatId) {
			const index = $chats.findIndex(c => c.id === chatId);
			currentChatIndex.set(index > -1 ? index : 0);
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

<!-- Main App with Error Boundary -->
<ErrorBoundary>
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
</ErrorBoundary>