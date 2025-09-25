<div class="[grid-area:content] flex flex-col overflow-hidden h-full">
	<main class="flex-1 bg-base-100 overflow-auto">
		<slot />
	</main>
	<div
		data-testid="message-composer-container"
		class="flex-none min-h-[80px] max-h-[50vh] bg-base-200 border-t-2 border-base-300 shadow-[0_-4px_6px_-1px_rgb(0_0_0_/_0.1)] flex items-center justify-center p-4"
	>
		<!-- MessageComposer will go here later -->
		<div class="text-base-content/50">Composer Area</div>
	</div>
</div>