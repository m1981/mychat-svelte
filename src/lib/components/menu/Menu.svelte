<!-- src/lib/components/menu/Menu.svelte -->
<script lang="ts">
	import { hideSideMenu } from '$lib/stores/ui.store';
	import SidebarIcon from '$lib/components/icons/SidebarIcon.svelte';
	import NewChat from './NewChat.svelte';
	import NewFolder from './NewFolder.svelte';
	import ChatSearch from './ChatSearch.svelte';
	import ChatHistoryList from './ChatHistoryList.svelte';

	let searchFilter = $state('');
</script>

<div
	id="menu"
	class="group/menu bg-base-100 h-full w-full flex flex-col transition-all duration-300 ease-in-out"
>
	<div class="flex h-full min-h-0 flex-col">
		<!-- Header with hamburger menu -->
		<div class="flex items-center justify-between p-3 border-b border-base-content/10">
			<h2 class="text-sm font-medium text-base-content/70">Chat History</h2>
			<button
				class="sidebar-toggle-btn"
				onclick={() => hideSideMenu.set(true)}
				title="Close sidebar"
			>
				<SidebarIcon class="w-5 h-5" />
			</button>
		</div>

		<!-- Action buttons -->
		<div class="px-3 pt-2 pb-2 border-base-content/10">
			<div class="flex gap-2">
				<NewChat />
				<NewFolder />
			</div>
		</div>

		<!-- Scrollable content area -->
		<div class="flex-1 min-h-0 overflow-hidden flex flex-col">
			<div class="px-3 py-2">
				<ChatSearch bind:filter={searchFilter} />
			</div>
			<div class="flex-1 min-h-0 overflow-y-auto invisible-scrollbar px-3">
				<ChatHistoryList {searchFilter} />
			</div>
		</div>

		<!-- Fixed bottom menu -->
		<div class="border-t border-base-content/10">
			<!-- <MenuOptions /> -->
			<div class="p-4 text-base-content/50">Menu Options (WIP)</div>
		</div>
	</div>
</div>