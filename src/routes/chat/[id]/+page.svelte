<!-- src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chats, updateChat } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import ChatMessages from '$lib/components/chat/ChatMessages.svelte';
	import NotesPanel from '$lib/components/chat/NotesPanel.svelte';
	import HighlightsPanel from '$lib/components/chat/HighlightsPanel.svelte';
	import type { Note, Highlight, Attachment } from '$lib/types/entities';

	// Access grouped stores via context
	const chatStores = getContext<{ notes: Note[]; highlights: Highlight[]; attachments: Attachment[]; totalItems: number }>('chatStores');

	const chatId = $derived($page.params.id);
	const currentChat = $derived($chats.find((c) => c.id === chatId));
	let activeTab = $state<'notes' | 'highlights'>('notes');
	let isEditingTitle = $state(false);
	let editedTitle = $state('');

	const messageIds = $derived(
		currentChat?.messages
			?.map((_, idx) => idx + 1)
			.filter((id) => id > 0) || []
	);

	$effect(() => {
		const timer = setTimeout(() => {
			if ($chats.length > 0 && !currentChat) {
				goto('/');
			}
		}, 100);
		return () => clearTimeout(timer);
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
			// ✅ CORRECT: Use store function
			await updateChat(currentChat.id, {
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
					Notes ({$chatStores?.notes?.length || 0})
				</button>
				<button
					role="tab"
					class="flex-1 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'highlights' ? 'border-b-2 border-primary text-base-content' : 'text-base-content/60 hover:text-base-content'}"
					aria-selected={activeTab === 'highlights'}
					onclick={() => (activeTab = 'highlights')}
				>
					Highlights ({$chatStores?.highlights?.length || 0})
				</button>
			</div>

			<!-- Tab content -->
			<div class="flex-1 overflow-hidden">
				{#if activeTab === 'notes'}
					<NotesPanel chatId={currentChat.id} />
				{:else}
					<HighlightsPanel chatId={currentChat.id} messageIds={messageIds} />
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="flex items-center justify-center h-full">
		<p class="text-base-content/50">Chat not found</p>
	</div>
{/if}