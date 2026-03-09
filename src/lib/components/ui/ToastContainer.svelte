<!-- src/lib/components/ui/ToastContainer.svelte -->
<script lang="ts">
	import { toast } from '$lib/stores/toast.store.svelte';
	import Toast from './Toast.svelte';

	type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
	let { position = 'top-right' }: { position?: ToastPosition } = $props();

	const positionClasses = {
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4',
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4',
		'top-center': 'top-4 left-1/2 -translate-x-1/2',
		'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
	};
</script>

<div data-testid="toast-container" class="toast toast-end {positionClasses[position] || positionClasses['top-right']} z-[9999]">
	<!-- REMOVED the $ from toast -->
	{#each toast.toasts as toastItem (toastItem.id)}
		<Toast {toastItem} />
	{/each}
</div>