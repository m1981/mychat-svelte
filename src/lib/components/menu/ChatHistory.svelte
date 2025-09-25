<!-- src/lib/components/menu/ChatHistory.svelte -->
<script lang="ts">
	import type { Chat } from '$lib/types/chat';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { chat, index }: { chat: Chat; index: number } = $props();

	// This component is now simple and robust. It only depends on the props it receives.
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
	<!-- You can add your icon component back in here if you have one -->
	<span class="w-[18px] h-[18px]"></span>
	<span class="flex-1 overflow-hidden text-ellipsis text-left">{chat.title}</span>
</button>