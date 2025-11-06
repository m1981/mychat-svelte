<script lang="ts">
	import { chats, generating } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import type { Chat } from '$lib/types/chat';

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
			const chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const now = new Date();

			const newChat: Chat = {
				id: chatId,
				userId: 1,
				title: 'New Chat',
				folderId: undefined,
				messages: [],
				config: {
					provider: 'anthropic',
					modelConfig: {
						model: 'claude-3-7-sonnet-20250219',
						max_tokens: 4096,
						temperature: 0.7,
						top_p: 1,
						presence_penalty: 0,
						frequency_penalty: 0
					}
				},
				tags: [],
				metadata: {
					tokenCount: 0,
					messageCount: 0,
					lastMessageAt: now
				},
				createdAt: now,
				updatedAt: now
			};

			const response = await fetch('/api/chats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newChat)
			});

			if (response.ok) {
				const savedChat = await response.json();
				chats.update(current => [savedChat, ...current]);
				goto(`/chat/${savedChat.id}`);
			}
		} catch (error) {
			console.error('Failed to create chat:', error);
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-center h-full p-8 text-center">
	<div class="max-w-2xl space-y-6">
		<!-- Hero Section -->
		<div class="space-y-4">
			<h1 class="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
				Welcome to BetterChatGPT
			</h1>
			<p class="text-xl text-base-content/70">
				Start a conversation with AI and experience intelligent, context-aware responses
			</p>
		</div>

		<!-- Features -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
			<div class="card bg-base-200 p-4">
				<div class="text-3xl mb-2">💬</div>
				<h3 class="font-semibold mb-1">Smart Conversations</h3>
				<p class="text-sm text-base-content/60">Real-time streaming responses</p>
			</div>
			<div class="card bg-base-200 p-4">
				<div class="text-3xl mb-2">📁</div>
				<h3 class="font-semibold mb-1">Organized Chats</h3>
				<p class="text-sm text-base-content/60">Folders and tags for structure</p>
			</div>
			<div class="card bg-base-200 p-4">
				<div class="text-3xl mb-2">✨</div>
				<h3 class="font-semibold mb-1">Highlights & Notes</h3>
				<p class="text-sm text-base-content/60">Save important moments</p>
			</div>
		</div>

		<!-- CTA Button -->
		<div class="mt-8">
			<button
				class="btn btn-primary btn-lg gap-2"
				onclick={createFirstChat}
				disabled={isCreating}
			>
				{#if isCreating}
					<span class="loading loading-spinner"></span>
					Creating...
				{:else}
					<PlusIcon />
					Start Your First Chat
				{/if}
			</button>
		</div>

		<!-- Secondary Info -->
		<p class="text-sm text-base-content/50 mt-4">
			Or use the sidebar to explore existing conversations
		</p>
	</div>
</div>
