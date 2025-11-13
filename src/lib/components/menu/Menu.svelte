<!-- src/lib/components/menu/Menu.svelte -->
<script lang="ts">
    import {hideSideMenu} from '$lib/stores/ui.store';
    import SidebarIcon from '$lib/components/icons/SidebarIcon.svelte';
    import NewChat from './NewChat.svelte';
    import NewFolder from './NewFolder.svelte';
    import ChatSearch from './ChatSearch.svelte';
    import ChatHistoryList from './ChatHistoryList.svelte';
    import {deletedFolders, restoreFolder, deleteFolder} from '$lib/stores/chat.store';

    let searchFilter = $state('');
    let archivedSectionExpanded = $state(false);
</script>

<div
        id="menu"
        class="group/menu bg-surface-50-950 h-full w-full flex flex-col transition-all duration-300 ease-in-out"
>
    <div class="flex h-full min-h-0 flex-col">
        <!-- Header with hamburger menu -->
        <div class="flex items-center justify-between p-3 border-b border-surface-950-50/10">
            <h2 class="text-sm font-medium text-surface-950-50/70">Chat History</h2>
            <button
                    class="sidebar-toggle-btn"
                    onclick={() => hideSideMenu.set(true)}
                    title="Close sidebar"
            >
                <SidebarIcon class="w-5 h-5"/>
            </button>
        </div>

        <!-- Action buttons -->
        <div class="px-3 pt-2 pb-2 border-surface-950-50/10">
            <div class="flex gap-2">
                <NewChat/>
                <NewFolder/>
            </div>
        </div>

        <!-- Scrollable content area -->
        <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div class="px-3 py-2">
                <ChatSearch bind:filter={searchFilter}/>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto invisible-scrollbar px-3">
                <ChatHistoryList {searchFilter}/>
                <!-- ADDED: Trash/Archived section -->
                {#if $deletedFolders.length > 0}
                    <div class="archived-section">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div class="archived-header"
                             onclick={() => (archivedSectionExpanded = !archivedSectionExpanded)}>
                            <!-- ... chevron icon ... -->
                            <span class="archived-title">Trash ({$deletedFolders.length})</span>
                        </div>
                        {#if archivedSectionExpanded}
                            <div class="archived-content">
                                {#each $deletedFolders as folder (folder.id)}
                                    <div class="deleted-folder-item">
                                        <span>{folder.name}</span>
                                        <div class="actions">
                                            <button title="Restore" onclick={() => restoreFolder(folder.id)}>🔄</button>
                                            <button title="Delete Permanently"
                                                    onclick={() => { if(confirm('Delete permanently? This cannot be undone.')) deleteFolder(folder.id, true)}}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Fixed bottom menu -->
        <div class="border-t border-surface-950-50/10">
            <!-- <MenuOptions /> -->
            <div class="p-4 text-surface-950-50/50">Menu Options (WIP)</div>
        </div>
    </div>
</div>


<style>
    /* ADDED: Styles for the new trash items */
    .deleted-folder-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        opacity: 0.7;
    }
    .deleted-folder-item .actions {
        display: flex;
        gap: 0.5rem;
    }
    .deleted-folder-item button {
        background: none;
        border: none;
        cursor: pointer;
    }
</style>