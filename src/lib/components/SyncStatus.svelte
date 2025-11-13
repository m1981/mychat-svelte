<!-- src/lib/components/SyncStatus.svelte -->
<script lang="ts">
	import { syncService } from '$lib/services/sync.service';
	import { syncStatus, refreshFromServer, chats, chatCount } from '$lib/stores/chat.store';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment'; // Import dev flag

	let expanded = $state(false);
	let remoteChatCount = $state<number | null>(null);
	let isLoadingRemoteCount = $state(false);
	let testMode = $state(false); // New state for test mode UI

	function toggleExpanded() {
		expanded = !expanded;
	}

	async function handleRefresh() {
		await refreshFromServer();
		await loadRemoteChatCount();
	}

	/**
	 * Load remote chat count from server
	 */
	async function loadRemoteChatCount() {
		isLoadingRemoteCount = true;
		try {
			const response = await fetch('/api/chats?limit=0');
			if (response.ok) {
				const data = await response.json();
				remoteChatCount = data.pagination?.total ?? null;
			}
		} catch (error) {
			console.error('Failed to load remote chat count:', error);
		} finally {
			isLoadingRemoteCount = false;
		}
	}

	// Load remote count on mount and after sync
	onMount(() => {
		loadRemoteChatCount();
	});

	// Reload remote count after successful sync
	$effect(() => {
		if (!$syncStatus.isSyncing && $syncStatus.lastSyncTime) {
			loadRemoteChatCount();
		}
	});

	// Auto-collapse after showing pending operations
	$effect(() => {
		if ($syncStatus.pendingOperations > 0) {
			expanded = true;
			const timer = setTimeout(() => {
				if ($syncStatus.pendingOperations === 0) {
					expanded = false;
				}
			}, 5000);
			return () => clearTimeout(timer);
		}
	});

	// Compute sync health status
	const syncHealth = $derived.by(() => {
		if (!$syncStatus.isOnline) return 'offline';
		if ($syncStatus.failedOperations > 0) return 'error';
		if ($syncStatus.pendingOperations > 0) return 'warning';
		if (remoteChatCount !== null && $chatCount !== remoteChatCount) return 'warning';
		return 'success';
	});
</script>

<div class="fixed bottom-4 right-4 z-50">
	{#if expanded}
		<!-- Extended view -->
		<div class="sync-card card shadow-xl p-4 min-w-[320px] max-w-[380px]">
			<div class="flex items-center justify-between mb-3">
				<h3 class="font-semibold text-sm flex items-center gap-2">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					Sync Status
				</h3>
				<button
					onclick={toggleExpanded}
					class="btn-icon btn-icon-sm variant-ghost-surface"
					aria-label="Close sync status"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-3 text-sm">
				<!-- Connection Status -->
				<div class="status-row">
				<div class="flex items-center gap-2">
					<div
							class="status-dot"
							class:online={$syncStatus.isOnline}
							class:offline={!$syncStatus.isOnline}
					></div>
						<span class="font-medium">Connection</span>
					</div>
					<span class="status-value">
						{$syncStatus.isOnline ? 'Online' : 'Offline'}
					</span>
				</div>

				<!-- Chat Counts -->
				<div class="divider"></div>

				<div class="status-section">
					<div class="status-section-title">Storage</div>

					<!-- Local (IndexedDB) -->
					<div class="status-row">
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
							</svg>
							<span>Local (Device)</span>
						</div>
						<span class="status-value font-mono">{$chatCount} {$chatCount === 1 ? 'chat' : 'chats'}</span>
					</div>

					<!-- Remote (Server) -->
					<div class="status-row">
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
							</svg>
							<span>Remote (Server)</span>
						</div>
						<span class="status-value font-mono">
							{#if isLoadingRemoteCount}
								<span class="loading loading-spinner loading-xs"></span>
							{:else if remoteChatCount !== null}
								{remoteChatCount} {remoteChatCount === 1 ? 'chat' : 'chats'}
							{:else}
								<span class="text-surface-500">—</span>
							{/if}
						</span>
					</div>

					<!-- Sync Status Warning -->
					{#if remoteChatCount !== null && $chatCount !== remoteChatCount}
						<div class="status-warning">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<span class="text-xs">Out of sync</span>
						</div>
					{/if}
				</div>

				<!-- Sync Activity -->
				{#if $syncStatus.isSyncing || $syncStatus.pendingOperations > 0 || $syncStatus.failedOperations > 0}
					<div class="divider"></div>

					<div class="status-section">
						<div class="status-section-title">Activity</div>

						<!-- Currently Syncing -->
				{#if $syncStatus.isSyncing}
							<div class="status-row">
					<div class="flex items-center gap-2">
						<span class="loading loading-spinner loading-xs"></span>
						<span>Syncing...</span>
								</div>
					</div>
				{/if}

				<!-- Pending Operations -->
				{#if $syncStatus.pendingOperations > 0}
							<div class="status-row text-warning-500">
								<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
									<span>Pending</span>
								</div>
								<span class="status-value font-mono">{$syncStatus.pendingOperations}</span>
					</div>
				{/if}

				<!-- Failed Operations -->
				{#if $syncStatus.failedOperations > 0}
							<div class="status-row text-error-500">
								<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
									<span>Failed</span>
								</div>
								<span class="status-value font-mono">{$syncStatus.failedOperations}</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Last Sync Time -->
				{#if $syncStatus.lastSyncTime}
					<div class="divider"></div>
					<div class="text-xs text-surface-500 text-center">
						Last synced: {new Date($syncStatus.lastSyncTime).toLocaleTimeString()}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-3 pt-3 border-t border-surface-300-700">
				<button
					onclick={handleRefresh}
					class="btn btn-sm w-full variant-filled-surface"
					disabled={$syncStatus.isSyncing || !$syncStatus.isOnline}
				>
					{#if $syncStatus.isSyncing}
						<span class="loading loading-spinner loading-xs"></span>
						Syncing...
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Force Sync
					{/if}
				</button>
			</div>

			<!-- START: New Test Mode Section -->
			{#if dev}
				<div class="mt-3 pt-3 border-t border-surface-300-700">
					<div class="flex justify-between items-center mb-2">
						<label for="test-mode-toggle" class="text-xs font-bold uppercase text-surface-500">
							Test Mode
						</label>
						<input id="test-mode-toggle" type="checkbox" class="toggle toggle-sm" bind:checked={testMode} />
					</div>
					{#if testMode}
						<div class="p-2 bg-warning-500/10 rounded-md space-y-2">
							<p class="text-xs text-warning-700 dark:text-warning-300">
								Simulate network status. This will override the browser's actual connection state.
							</p>
							<div class="flex gap-2">
								<button
									class="btn btn-sm flex-1 variant-soft-error"
									onclick={() => syncService.forceOffline()}
									disabled={!$syncStatus.isOnline}
								>
									Go Offline
								</button>
								<button
									class="btn btn-sm flex-1 variant-soft-success"
									onclick={() => syncService.forceOnline()}
									disabled={$syncStatus.isOnline}
								>
									Go Online
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
			<!-- END: New Test Mode Section -->
		</div>
	{:else}
		<!-- Compact indicator -->
		<button
			onclick={toggleExpanded}
			class="sync-indicator btn-icon shadow-xl"
			class:variant-filled-success={syncHealth === 'success'}
			class:variant-filled-warning={syncHealth === 'warning'}
			class:variant-filled-error={syncHealth === 'error' || syncHealth === 'offline'}
			title="Sync Status: {syncHealth}"
			aria-label="Sync status indicator"
		>
			{#if $syncStatus.isSyncing}
				<span class="loading loading-spinner loading-xs"></span>
			{:else if syncHealth === 'error'}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else if syncHealth === 'warning'}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{:else if syncHealth === 'offline'}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
				</svg>
			{:else}
				<!-- Success: Show chat count badge -->
				<div class="relative">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
					{#if $chatCount > 0}
						<span class="sync-badge">{$chatCount}</span>
					{/if}
				</div>
			{/if}
		</button>
	{/if}
</div>

<style>
	.sync-card {
		background: var(--color-surface-100);
		border: 1px solid var(--color-surface-300);
	}

	:global(.dark) .sync-card {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}

	.status-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
	}

	.status-value {
		color: var(--color-surface-600);
		font-size: 0.875rem;
	}

	:global(.dark) .status-value {
		color: var(--color-surface-400);
	}

	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.status-dot.online {
		background-color: rgb(34, 197, 94); /* success-500 */
	}

	.status-dot.offline {
		background-color: rgb(239, 68, 68); /* error-500 */
	}

	.status-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-500);
		margin-bottom: 0.25rem;
	}

	.status-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background-color: rgb(254, 243, 199); /* warning-100 */
		color: rgb(161, 98, 7); /* warning-700 */
		border-radius: 0.375rem;
		margin-top: 0.5rem;
	}

	:global(.dark) .status-warning {
		background-color: rgb(69, 26, 3); /* warning-950 */
		color: rgb(253, 224, 71); /* warning-300 */
	}

	.divider {
		height: 1px;
		background-color: var(--color-surface-300);
		margin: 0.5rem 0;
	}

	:global(.dark) .divider {
		background-color: var(--color-surface-700);
	}

	.sync-indicator {
		position: relative;
		width: 3rem;
		height: 3rem;
	}

	.sync-badge {
		position: absolute;
		top: -0.25rem;
		right: -0.25rem;
		background-color: rgb(59, 130, 246); /* primary-500 */
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		min-width: 1.25rem;
		text-align: center;
	}
</style>