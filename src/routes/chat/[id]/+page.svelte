<!-- src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chatStore } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import ChatMessages from '$lib/components/chat/ChatMessages.svelte';
	import NotesPanel from '$lib/components/chat/NotesPanel.svelte';
	import HighlightsPanel from '$lib/components/chat/HighlightsPanel.svelte';

	const chatId = $derived($page.params.id);

	// ✅ Access state directly from the rune-based store
	const currentChat = $derived(chatStore.state.chats.find((c) => c.id === chatId));

	let activeTab = $state<'notes' | 'highlights'>('notes');
	let isEditingTitle = $state(false);
	let editedTitle = $state('');

	// ✅ More robust redirect effect
	$effect(() => {
		// This effect runs whenever isLoaded or chatId changes.
		if (chatStore.state.isLoaded) {
			const chatExists = chatStore.state.chats.some((c) => c.id === chatId);
			if (!chatExists) {
				// Use a microtask to avoid navigation during component initialization
				queueMicrotask(() => goto('/'));
			}
		}
	});

	function startEditingTitle() {
		if (currentChat) {
			isEditingTitle = true;
			editedTitle = currentChat.title;
		}
	}

	async function saveTitle() {
		if (!currentChat || !editedTitle.trim()) {
			isEditingTitle = false;
			return;
		}

		try {
			// ✅ Use refactored store function
			await chatStore.updateChat(currentChat.id, {
				title: editedTitle.trim()
			});
		} catch (error) {
			console.error('❌ Failed to update title:', error);
			// TODO: Show error toast using uiBus
		}
		isEditingTitle = false;
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveTitle();
		} else if (e.key === 'Escape') {
			isEditingTitle = false;
		}
	}
</script>

{#if currentChat}
	<div class="flex h-full">
		<!-- Main chat area -->
		<div class="flex-1 flex flex-col">
			<!-- Chat header -->
			<div class="p-4 border-b">
				{#if isEditingTitle}
					<input
						type="text"
						bind:value={editedTitle}
						onkeydown={handleTitleKeydown}
						onblur={saveTitle}
						class="input w-full max-w-md border border-base-300 rounded px-3 py-2"
						autofocus
					/>
				{:else}
					<h1
						class="text-2xl font-bold cursor-pointer hover:text-primary"
						ondblclick={startEditingTitle}
						data-testid="chat-title"
					>
						{currentChat.title}
					</h1>
				{/if}
			</div>

			<!-- Messages area -->
			<ChatMessages messages={currentChat.messages} chatId={currentChat.id} />
		</div>

		<!-- Side panel with tabs -->
		<div class="w-96 border-l flex flex-col">
			<!-- Tabs -->
			<div role="tablist" class="flex border-b border-base-300">
				<button
					role="tab"
					class="flex-1 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'notes' ? 'border-b-2 border-primary text-base-content' : 'text-base-content/60 hover:text-base-content'}"
					aria-selected={activeTab === 'notes'}
					onclick={() => (activeTab = 'notes')}
				>
					Notes
				</button>
				<button
					role="tab"
					class="flex-1 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'highlights' ? 'border-b-2 border-primary text-base-content' : 'text-base-content/60 hover:text-base-content'}"
					aria-selected={activeTab === 'highlights'}
					onclick={() => (activeTab = 'highlights')}
				>
					Highlights
				</button>
			</div>

			<!-- Tab content -->
			<div class="flex-1 overflow-hidden">
				{#if activeTab === 'notes'}
					<!-- ✅ Pass chatId directly. The component handles its own data. -->
					<NotesPanel {chatId} />
				{:else}
					<!-- ✅ Pass chatId directly. The component handles its own data. -->
					<HighlightsPanel {chatId} />
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- This content will show while loading or if chat is not found -->
	<div class="flex items-center justify-center h-full">
		{#if !chatStore.state.isLoaded}
			<p class="text-base-content/50">Loading chat...</p>
		{:else}
		<p class="text-base-content/50">Chat not found</p>
		{/if}
	</div>
{/if}