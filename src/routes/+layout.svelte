<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Menu from '$lib/components/menu/Menu.svelte'; // <-- IMPORT MENU
	import { hideSideMenu } from '$lib/stores/ui.store';

	let { children } = $props();

	// Use `$state` for reactive local variables in Svelte 5
	let isTransitioning = $state(false);

	// Use `$effect` for side effects instead of the legacy `$: {}` block.
	// This code will re-run whenever `$hideSideMenu` changes.
	$effect(() => {
		// Reading the store value here makes it a dependency of the effect.
		const isHidden = $hideSideMenu;

		// To prevent the effect from running on the initial component mount,
		// we can add a check, but for this simple transition, it's okay.
			isTransitioning = true;
		const timer = setTimeout(() => {
				isTransitioning = false;
			}, 300);

		// The effect can return a cleanup function, which is perfect for timers.
		return () => {
			clearTimeout(timer);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>BetterChatGPT</title>
</svelte:head>

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
		<!-- The `$hideSideMenu` syntax for reading store values in the template is correct -->
		<Sidebar isVisible={!$hideSideMenu}>
			<Menu /> <!-- <-- USE MENU COMPONENT -->
		</Sidebar>

		<Header>
			<div class="text-base-content/50">Header Content</div>
		</Header>

		<Main>
			{@render children()}
		</Main>
	</div>
</div>