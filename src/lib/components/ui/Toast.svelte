<!-- src/lib/components/ui/Toast.svelte -->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Toast as ToastType } from '$lib/stores/toast.store';
	import { toast } from '$lib/stores/toast.store';

	let { toastItem }: { toastItem: ToastType } = $props();

	// Icon components for each toast type
	const icons = {
		success: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
		</svg>`,
		error: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
		</svg>`,
		warning: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
		</svg>`,
		info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
		</svg>`
	};

	// DaisyUI alert classes for each type
	const alertClasses = {
		success: 'alert-success',
		error: 'alert-error',
		warning: 'alert-warning',
		info: 'alert-info'
	};

	function handleDismiss() {
		toast.dismiss(toastItem.id);
	}
</script>

<div
	role="alert"
	class="alert {alertClasses[toastItem.type]} shadow-lg min-w-[300px] max-w-[500px]"
	in:fly={{ x: 300, duration: 300, easing: quintOut }}
	out:fly={{ x: 300, duration: 200, easing: quintOut }}
>
	<!-- Icon -->
	<div class="flex-shrink-0">
		{@html icons[toastItem.type]}
	</div>

	<!-- Content -->
	<div class="flex-1">
		{#if toastItem.title}
			<h3 class="font-bold">{toastItem.title}</h3>
			<div class="text-sm">{toastItem.message}</div>
		{:else}
			<span>{toastItem.message}</span>
		{/if}
	</div>

	<!-- Dismiss button -->
	{#if toastItem.dismissible}
		<button
			class="btn btn-sm btn-ghost btn-circle"
			onclick={handleDismiss}
			aria-label="Dismiss notification"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>