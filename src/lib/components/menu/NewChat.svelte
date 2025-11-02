<!-- src/lib/components/menu/NewChat.svelte -->
<script lang="ts">
	import PlusIcon from '$lib/components/icons/PlusIcon.svelte';
	import { chats, generating } from '$lib/stores/chat.store';
	import { goto } from '$app/navigation';
	import type { Chat } from '$lib/types/chat';

	let { folder, showOnHover = false }: { folder?: string; showOnHover?: boolean } = $props();
	let hovered = $state(false);

	/**
	 * Creates a new chat with default configuration and navigates to it
	 */
	function addChat() {
		if ($generating) return;

		// Generate unique ID using timestamp + random string
		const chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		// Create new chat object with default configuration
		const newChat: Chat = {
			id: chatId,
			title: 'New Chat',
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
			folder: folder // Will be undefined if creating at root level
		};

		// Add the new chat to the store
		chats.update((currentChats) => {
			// If folder is specified, add after other chats in that folder
			if (folder) {
				const folderChatIndex = currentChats.findLastIndex((c) => c.folder === folder);
				if (folderChatIndex !== -1) {
					const updatedChats = [...currentChats];
					updatedChats.splice(folderChatIndex + 1, 0, newChat);
					return updatedChats;
				}
			}
			// Otherwise, add to the end
			return [...currentChats, newChat];
		});

		// Navigate to the newly created chat
		goto(`/chat/${chatId}`);

		console.log(`✅ Created new chat: ${chatId}${folder ? ` in folder ${folder}` : ''}`);
	}
</script>

	{#if folder}
	<button
		class="new-chat-btn new-chat-btn--folder"
		class:new-chat-btn--normal={!$generating}
		class:new-chat-btn--disabled={$generating}
		disabled={$generating}
		onclick={addChat}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
	aria-label="New Chat"
	>
		<div
			class="new-chat-folder-content"
			class:new-chat-folder-content--visible={showOnHover || hovered}
			class:new-chat-folder-content--hidden={!showOnHover && !hovered}
		>
			<PlusIcon /> New Chat
		</div>
	</button>
	{:else}
	<button
		class="new-chat-btn new-chat-btn--standalone"
		class:new-chat-btn--normal={!$generating}
		class:new-chat-btn--disabled={$generating}
		disabled={$generating}
		onclick={addChat}
		aria-label="New Chat"
	>
		<PlusIcon />
		New Chat
	</button>
	{/if}