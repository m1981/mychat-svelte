<!-- src/lib/components/SyncStatus.svelte -->
<script lang="ts">
	import { syncStatus, refreshFromServer } from '$lib/stores/chat.store.enhanced';

	let expanded = $state(false);

	function toggleExpanded() {
		expanded = !expanded;
	}

	function handleRefresh() {
		refreshFromServer();
	}

	// Auto-collapse after showing pending operations
	$effect(() => {
		if ($syncStatus.pendingOperations > 0) {
			expanded = true;
			setTimeout(() => {
				if ($syncStatus.pendingOperations === 0) {
					expanded = false;
				}
			}, 5000);
		}
	});
</script>

<div class="fixed bottom-4 right-4 z-50">
	{#if expanded}
		<!-- Extended view -->
		<div class="bg-base-200 rounded-lg shadow-lg p-4 min-w-[280px] border border-base-300">
			<div class="flex items-center justify-between mb-3">
				<h3 class="font-semibold text-sm">Sync Status</h3>
				<button onclick={toggleExpanded} class="btn btn-ghost btn-xs btn-circle" aria-label="Close sync status">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-2 text-sm">
				<!-- Connection Status -->
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 rounded-full" class:bg-success={$syncStatus.isOnline} class:bg-error={!$syncStatus.isOnline}></div>
					<span>{$syncStatus.isOnline ? 'Online' : 'Offline'}</span>
				</div>

				<!-- Sync Status -->
				{#if $syncStatus.isSyncing}
					<div class="flex items-center gap-2">
						<span class="loading loading-spinner loading-xs"></span>
						<span>Syncing...</span>
					</div>
				{/if}

				<!-- Pending Operations -->
				{#if $syncStatus.pendingOperations > 0}
					<div class="flex items-center gap-2 text-warning">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{$syncStatus.pendingOperations} pending</span>
					</div>
				{/if}

				<!-- Failed Operations -->
				{#if $syncStatus.failedOperations > 0}
					<div class="flex items-center gap-2 text-error">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{$syncStatus.failedOperations} failed</span>
					</div>
				{/if}

				<!-- Last Sync Time -->
				{#if $syncStatus.lastSyncTime}
					<div class="text-xs text-base-content/60">
						Last sync: {new Date($syncStatus.lastSyncTime).toLocaleTimeString()}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-3 pt-3 border-t border-base-300">
				<button
					onclick={handleRefresh}
					class="btn btn-sm btn-block"
					disabled={$syncStatus.isSyncing || !$syncStatus.isOnline}
				>
					{#if $syncStatus.isSyncing}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					{/if}
					Refresh
				</button>
			</div>
		</div>
	{:else}
		<!-- Compact indicator -->
		<button
			onclick={toggleExpanded}
			class="btn btn-circle btn-sm shadow-lg"
			class:btn-filled-success={$syncStatus.isOnline && $syncStatus.pendingOperations === 0}
			class:btn-filled-warning={$syncStatus.pendingOperations > 0}
			class:btn-filled-error={!$syncStatus.isOnline || $syncStatus.failedOperations > 0}
			title="Sync Status"
			aria-label="Sync status indicator"
		>
			{#if $syncStatus.isSyncing}
				<span class="loading loading-spinner loading-xs"></span>
			{:else if $syncStatus.failedOperations > 0}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else if $syncStatus.pendingOperations > 0}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else if $syncStatus.isOnline}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
				</svg>
			{/if}
		</button>
	{/if}
</div>