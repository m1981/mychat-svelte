<!-- src/lib/components/menu/ChatHistory.svelte -->
<script lang="ts">
	import { chats } from '$lib/stores/chat.store'; // This is the likely source of the problem
	import type { Chat } from '$lib/types/chat';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// NOTE: All 'svelte-icons-pack' imports have been removed to fix the build error.

	let { chat, index }: { chat: Chat; index: number } = $props();

	// --- [DEBUG LOG 1] ---
	// First, let's confirm the props being passed INTO this component are valid.
	console.log(`[ChatHistory DEBUG 1] Component instance for "${chat?.title}" received valid props:`, {
		chat: JSON.parse(JSON.stringify(chat)),
		index
	});

	// This is a hypothetical piece of logic that matches your error description.
	// It accesses the global store directly, which is where the "dirty" data lives.
	const someOtherChats = $derived(
		$chats.filter((c) => {
			// --- [DEBUG LOG 2] ---
			// This will log EVERY item from the global $chats store as we filter it.
			// We are looking for an item that is `undefined`, `null`, or missing a `title`.
			console.log('[ChatHistory DEBUG 2] Inside filter, checking chat object:', c);

			// ✅ THE FIX: A defensive guard clause.
			// If the chat object `c` is falsy (null/undefined) or its title is not a string,
			// we immediately return `false` to skip it. This prevents the crash.
			if (!c || typeof c.title !== 'string') {
				// --- [DEBUG LOG 3] ---
				// This is the most important log. It will fire ONLY when we find bad data.
				console.error('[ChatHistory DEBUG 3] FOUND MALFORMED CHAT OBJECT IN GLOBAL STORE:', c);
				return false;
			}

			// This is the line that was crashing (line 39 in your original file).
			// It will now only run if the guard clause above passes.
			return c.title.toLowerCase().includes('some keyword') && c.id !== chat.id;
		})
	);

	const isActive = $derived($page.url.pathname.endsWith(chat.id));

	function navigateToChat() {
		goto(`/chat/${chat.id}`);
	}
</script>

<button
	onclick={navigateToChat}
	class="btn btn-ghost btn-sm flex h-10 w-full items-center justify-start gap-2 truncate whitespace-nowrap px-2"
	class:btn-active={isActive}
	title={chat.title}
>
	<!-- A simple placeholder for the icon -->
	<span class="w-[18px] h-[18px]"></span>
	<span class="flex-1 overflow-hidden text-ellipsis text-left">{chat.title}</span>
</button>