<!-- src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { chats } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import ChatMessages from '$lib/components/chat/ChatMessages.svelte';
	import NotesPanel from '$lib/components/chat/NotesPanel.svelte';
	import HighlightsPanel from '$lib/components/chat/HighlightsPanel.svelte';

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
			const response = await fetch(`/api/chats/${currentChat.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: editedTitle.trim() })
			});

			if (response.ok) {
				const updated = await response.json();
				currentChat.title = updated.title;
				chats.set([...$chats]);
			}
		} catch (error) {
			console.error('Failed to update title:', error);
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
						class="input input-bordered w-full max-w-md"
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
			<div role="tablist" class="tabs tabs-bordered">
				<button
					role="tab"
					class="tab"
					class:tab-active={activeTab === 'notes'}
					aria-selected={activeTab === 'notes'}
					onclick={() => (activeTab = 'notes')}
				>
					Notes
				</button>
				<button
					role="tab"
					class="tab"
					class:tab-active={activeTab === 'highlights'}
					aria-selected={activeTab === 'highlights'}
					onclick={() => (activeTab = 'highlights')}
				>
					Highlights
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