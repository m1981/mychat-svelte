<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SecondaryPanel from '$lib/components/layout/SecondaryPanel.svelte';
	import Menu from '$lib/components/menu/Menu.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { app } from '$lib/state/app.svelte';
	import { page } from '$app/stores';
	import { signOut } from '@auth/sveltekit/client';

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
		class="w-full h-full grid shadow-xl rounded-md overflow-hidden grid-rows-[var(--layout-header-height)_1fr] grid-cols-[auto_1fr_auto]"
		style:max-width="var(--layout-app-max-width)"
		style:grid-template-areas={`
      "sidebar header secondary"
      "sidebar content secondary"
    `}
	>
		<Sidebar isVisible={app.isSidebarOpen}>
			<ErrorBoundary showToast={false} logErrors={true}>
				<Menu />
			</ErrorBoundary>
		</Sidebar>

		<Header>
			{#if data.session?.user}
				<div class="flex items-center gap-2">
					{#if data.session.user.image}
						<img src={data.session.user.image} alt="avatar" class="w-7 h-7 rounded-full" />
					{/if}
					<span class="text-sm text-base-content/70">{data.session.user.name ?? data.session.user.email}</span>
					<button
						data-testid="signout-btn"
						class="btn btn-xs btn-ghost"
						onclick={() => signOut()}>Sign out</button>
				</div>
			{/if}
		</Header>

		<Main>
			<ErrorBoundary>
				{@render children()}
			</ErrorBoundary>
		</Main>

		<SecondaryPanel />
	</div>
</div>
</ErrorBoundary>