<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { app } from '$lib/state/app.svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Initialize state from server
	$effect(() => {
		app.chats = data.chats || [];
		app.folders = data.folders || [];
	});

	// Sync active chat with URL
	$effect(() => {
		app.activeChatId = $page.params.id || null;
	});
</script>

<ToastContainer position="top-right" />

<ErrorBoundary>
<div class="w-full h-screen flex justify-center bg-base-300" style="padding: var(--layout-container-padding)">
	<div
		class="w-full h-full grid shadow-xl rounded-md overflow-hidden grid-rows-[var(--layout-header-height)_1fr] grid-cols-[auto_1fr]"
		style:max-width="var(--layout-app-max-width)"
		style:grid-template-areas={`
      "sidebar header"
      "sidebar content"
    `}
	>
		<Sidebar isVisible={app.isSidebarOpen}>
			<ErrorBoundary showToast={false} logErrors={true}>
				<Menu />
			</ErrorBoundary>
		</Sidebar>

		<Header>
			<div class="text-base-content/50">Header Content</div>
		</Header>

		<Main>
			<ErrorBoundary>
				{@render children()}
			</ErrorBoundary>
		</Main>
	</div>
</div>
</ErrorBoundary>