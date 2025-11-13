<!-- src/lib/components/ui/ErrorBoundary.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';

	interface Props {
		children?: any;
		showToast?: boolean;
		logErrors?: boolean;
	}

	let {
		children,
		showToast = true,
		logErrors = true
	}: Props = $props();

	let hasError = $state(false);
	let errorMessage = $state('');
	let errorDetails = $state<any>(null);

	function logError(error: Error | any) {
		console.group('🚨 Error Boundary Caught Error');
		console.error('Error object:', error);
		console.error('Error name:', error?.name);
		console.error('Error message:', error?.message);
		console.error('Error stack:', error?.stack);

		// Try to extract more details
		if (error?.cause) {
			console.error('Error cause:', error.cause);
		}

		if (error?.componentStack) {
			console.error('Component stack:', error.componentStack);
		}

		// Log all enumerable properties
		console.error('All error properties:', Object.keys(error));
		for (let key in error) {
			console.error(`  ${key}:`, error[key]);
		}

		console.groupEnd();
	}

	function handleError(event: ErrorEvent | PromiseRejectionEvent) {
		const error = 'error' in event ? event.error : event.reason;

		hasError = true;
		errorMessage = error?.message || 'An unexpected error occurred';
		errorDetails = error;

		if (logErrors) {
			logError(error);
		}

		// Prevent default error handling
		event.preventDefault();
		return false;
	}

	// Set up global error handler (fallback)
	if (typeof window !== 'undefined') {
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleError);
	}

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleError);
		}
	});

	function resetError() {
		hasError = false;
		errorMessage = '';
		errorDetails = null;
	}
</script>

{#if hasError}
	<div class="error-boundary-container">
		<div class="error-boundary-content">
			<div class="error-icon">⚠️</div>
			<h2 class="error-title">Something went wrong</h2>
			<p class="error-message">{errorMessage}</p>

			{#if errorDetails}
				<details class="error-details">
					<summary>Technical Details</summary>
					<pre>{JSON.stringify(errorDetails, null, 2)}</pre>
				</details>
			{/if}

			<button
				onclick={resetError}
				class="btn variant-filled-primary"
			>
				Try Again
			</button>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}

<style>
	.error-boundary-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background-color: var(--color-surface-50);
	}

	:global(.dark) .error-boundary-container {
		background-color: var(--color-surface-950);
	}

	.error-boundary-content {
		max-width: 600px;
		padding: 2rem;
		text-align: center;
		background: var(--color-surface-100);
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .error-boundary-content {
		background: var(--color-surface-900);
	}

	.error-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: var(--color-error-500);
	}

	.error-message {
		color: var(--color-surface-700);
		margin-bottom: 1.5rem;
	}

	:global(.dark) .error-message {
		color: var(--color-surface-300);
	}

	.error-details {
		text-align: left;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--color-surface-200);
		border-radius: 0.25rem;
	}

	:global(.dark) .error-details {
		background: var(--color-surface-800);
	}

	.error-details pre {
		overflow-x: auto;
		font-size: 0.875rem;
		margin: 0.5rem 0 0 0;
	}
</style>