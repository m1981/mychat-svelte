<!-- src/routes/+page.svelte - CORRECTED to use store functions -->
<script lang="ts">
	import { chats, generating, createChat } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';

	let isCreating = $state(false);

	// Auto-redirect to most recent chat if chats exist
	onMount(() => {
		if ($chats.length > 0) {
			goto(`/chat/${$chats[0].id}`);
		}
	});

	async function createFirstChat() {
		if ($generating || isCreating) return;

		isCreating = true;

		try {
			// ✅ CORRECT: Use store function instead of raw fetch
			const newChat = await createChat({
				title: 'New Chat'
			});

			// Navigate to the new chat
			goto(`/chat/${newChat.id}`);
		} catch (error) {
			console.error('❌ Failed to create chat:', error);
			// TODO: Show error toast using uiBus
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-center h-full p-8 text-center">
	<div class="max-w-2xl space-y-6">
		<!-- Hero Section -->
		<div class="space-y-4">
			<h1 class="text-5xl font-bold gradient-heading" data-testid="welcome-title">
				Welcome to BetterChatGPT
			</h1>
			<p class="text-xl text-surface-600-400">
				Start a conversation with AI and experience intelligent, context-aware responses
			</p>
		</div>

		<!-- Features -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
			<div class="card p-4">
				<div class="text-3xl mb-2">💬</div>
				<h3 class="font-semibold mb-1">Smart Conversations</h3>
				<p class="text-sm text-surface-600-400">Real-time streaming responses</p>
			</div>
			<div class="card p-4">
				<div class="text-3xl mb-2">📁</div>
				<h3 class="font-semibold mb-1">Organized Chats</h3>
				<p class="text-sm text-surface-600-400">Folders and tags for structure</p>
			</div>
			<div class="card p-4">
				<div class="text-3xl mb-2">✨</div>
				<h3 class="font-semibold mb-1">Highlights & Notes</h3>
				<p class="text-sm text-surface-600-400">Save important moments</p>
			</div>
		</div>

		<!-- CTA Button -->
		<div class="mt-8">
			<button
				class="btn variant-filled-primary btn-lg gap-2"
				onclick={createFirstChat}
				disabled={isCreating}
				data-testid="start-first-chat-button"
			>
				{#if isCreating}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<PlusIcon />
					Start Your First Chat
				{/if}
			</button>
		</div>

		<!-- Secondary Info -->
		<p class="text-sm text-surface-500 mt-4">
			Or use the sidebar to explore existing conversations
		</p>
	</div>
</div>
