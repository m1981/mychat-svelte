<!-- src/lib/components/ui/ErrorBoundary.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.store';

	let {
		children,
		fallback,
		onError,
		showToast = true,
		logErrors = true
	}: {
		children: import('svelte').Snippet;
		fallback?: import('svelte').Snippet<[Error]>;
		onError?: (error: Error, errorInfo: { componentStack?: string }) => void;
		showToast?: boolean;
		logErrors?: boolean;
	} = $props();

	let hasError = $state(false);
	let error = $state<Error | null>(null);

	// Error logging service (can be extended to send to Sentry, LogRocket, etc.)
	function logError(err: Error, errorInfo?: { componentStack?: string }) {
		if (logErrors) {
			console.error('🚨 Error Boundary caught an error:', {
				error: err,
				message: err.message,
				stack: err.stack,
				componentStack: errorInfo?.componentStack,
				timestamp: new Date().toISOString()
			});
		}

		// Call custom error handler if provided
		if (onError) {
			onError(err, errorInfo || {});
		}

		// Show toast notification
		if (showToast) {
			toast.error(err.message || 'An unexpected error occurred', {
				title: 'Error',
				duration: 5000
			});
		}
	}

	// Handle errors in child components
	function handleError(err: Error) {
		error = err;
		hasError = true;
		logError(err);
	}

	// Reset error boundary
	function resetError() {
		hasError = false;
		error = null;
	}

	// Set up global error handler for this boundary's scope
	onMount(() => {
		const errorHandler = (event: ErrorEvent) => {
			event.preventDefault();
			handleError(event.error);
		};

		const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
			event.preventDefault();
			const error = event.reason instanceof Error
				? event.reason
				: new Error(String(event.reason));
			handleError(error);
		};

		window.addEventListener('error', errorHandler);
		window.addEventListener('unhandledrejection', unhandledRejectionHandler);

		return () => {
			window.removeEventListener('error', errorHandler);
			window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
		};
	});
</script>

{#if hasError && error}
	{#if fallback}
		{@render fallback(error)}
	{:else}
		<!-- Default fallback UI -->
		<div class="flex items-center justify-center min-h-[400px] p-8">
			<div class="card bg-base-200 shadow-xl max-w-lg">
				<div class="card-body">
					<h2 class="card-title text-error">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						Something went wrong
					</h2>
					<p class="text-base-content/70">
						{error.message || 'An unexpected error occurred. Please try again.'}
					</p>

					{#if import.meta.env.DEV}
						<div class="mt-4">
							<details class="border border-base-300 rounded bg-base-300/50">
								<summary class="cursor-pointer p-3 text-sm font-medium hover:bg-base-300/70 transition-colors">
									Error Details (Dev Mode)
								</summary>
								<div class="border-t border-base-300 p-3">
									<pre class="text-xs overflow-auto max-h-[200px] bg-base-100 p-2 rounded">{error.stack}</pre>
								</div>
							</details>
						</div>
					{/if}

					<div class="card-actions justify-end mt-4">
						<button class="btn btn-ghost" onclick={() => window.location.reload()}>
							Reload Page
						</button>
						<button class="btn btn-filled-primary" onclick={resetError}>
							Try Again
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}