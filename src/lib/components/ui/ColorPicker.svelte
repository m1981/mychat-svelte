<!-- src/lib/components/ui/ColorPicker.svelte -->
<script lang="ts">
	let {
		selectedColor = $bindable(),
		onColorSelect,
		isOpen = $bindable(false)
	}: {
		selectedColor?: string;
		onColorSelect?: (color: string) => void;
		isOpen?: boolean;
	} = $props();

	// Predefined color palette
	const colors = [
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Green', value: '#10b981' },
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Yellow', value: '#eab308' },
		{ name: 'Purple', value: '#a855f7' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Pink', value: '#ec4899' },
		{ name: 'Gray', value: '#6b7280' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Indigo', value: '#6366f1' },
		{ name: 'None', value: '' }
	];

	function handleColorClick(color: string) {
		selectedColor = color;
		onColorSelect?.(color);
		isOpen = false;
	}

	function handleBackdropClick() {
		isOpen = false;
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="color-picker-backdrop" onclick={handleBackdropClick}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="color-picker-popover" onclick={(e) => e.stopPropagation()}>
			<div class="color-picker-header">
				<h3 class="color-picker-title">Choose Folder Color</h3>
			</div>
			<div class="color-picker-grid">
				{#each colors as color}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="color-option"
						class:selected={selectedColor === color.value}
						onclick={() => handleColorClick(color.value)}
						title={color.name}
					>
						{#if color.value}
							<div class="color-circle" style:background-color={color.value}></div>
						{:else}
							<div class="color-circle-none">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-6 h-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
						{/if}
						<span class="color-name">{color.name}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.color-picker-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.color-picker-popover {
		background-color: var(--color-base-100);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
	}

	.color-picker-header {
		margin-bottom: 1rem;
	}

	.color-picker-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-base-content);
		margin: 0;
	}

	.color-picker-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.color-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		border: 2px solid transparent;
	}

	.color-option:hover {
		background-color: var(--color-base-200);
	}

	.color-option.selected {
		border-color: var(--color-primary);
		background-color: var(--color-base-200);
	}

	.color-circle {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid var(--color-base-300);
		transition: transform 0.2s;
	}

	.color-option:hover .color-circle {
		transform: scale(1.1);
	}

	.color-circle-none {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid var(--color-base-300);
		background-color: var(--color-base-100);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-base-content);
		transition: transform 0.2s;
	}

	.color-option:hover .color-circle-none {
		transform: scale(1.1);
	}

	.color-name {
		font-size: 0.875rem;
		color: var(--color-base-content);
		text-align: center;
	}
</style>
