<!-- File: src/routes/chat/[id]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { app } from '$lib/state/app.svelte';
	import { goto } from '$app/navigation';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { marked } from 'marked';
	import hljs from 'highlight.js';
	import MessageComposer from '$lib/components/layout/MessageComposer.svelte';

	// Custom renderer: wrap code blocks with copy button
	const renderer = new marked.Renderer();
	renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
		const language = hljs.getLanguage(lang || '') ? lang! : 'plaintext';
		const highlighted = hljs.highlight(text, { language }).value;
		return `<div class="code-block relative group my-2">
<button class="copy-btn absolute top-2 right-2 btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 z-10" data-code="${encodeURIComponent(text)}">Copy</button>
<pre class="rounded-lg overflow-x-auto"><code class="hljs language-${language}">${highlighted}</code></pre>
</div>`;
	};
	marked.use({ renderer });

	let { data } = $props();
	const chatId = $derived($page.params.id);
	const currentChatMetadata = $derived(app.chats.find((c) => c.id === chatId));

	let chatInstance = $state(
		new Chat({
			transport: new DefaultChatTransport({ api: `/api/chat/${$page.params.id}` }),
			messages: data.messages
		})
	);

	let dbMessageMap = $state<Map<string, string>>(
		new Map(data.messages.map((m) => [m.id, m.id]))
	);

	// Popover state for text selection
	let popover = $state<{ x: number; y: number; text: string; messageId: string } | null>(null);

	// Auto-scroll ref
	let messagesEnd = $state<HTMLDivElement | undefined>();

	$effect(() => {
		chatInstance = new Chat({
			transport: new DefaultChatTransport({ api: `/api/chat/${chatId}` }),
			messages: data.messages
		});
		dbMessageMap = new Map(data.messages.map((m) => [m.id, m.id]));
	});

	$effect(() => {
		app.activeChatId = chatId || null;
		if (app.chats.length > 0 && !currentChatMetadata) {
			goto('/');
		}
	});

	// Load notes and highlights when chat changes
	$effect(() => {
		if (chatId) {
			app.loadChatKnowledge(chatId);
		}
	});

	// Auto-scroll to bottom whenever messages change or streaming progresses
	$effect(() => {
		// Track messages length and last message content to trigger on stream updates
		const _ = chatInstance.messages.length;
		const lastMsg = chatInstance.messages[chatInstance.messages.length - 1];
		const __ = lastMsg?.parts?.map((p: any) => p.text).join('');
		messagesEnd?.scrollIntoView({ behavior: 'smooth' });
	});

	// Refresh chat title + dbMessageMap after streaming finishes
	$effect(() => {
		if (chatInstance.status === 'ready') {
			const idx = app.chats.findIndex((c) => c.id === chatId);
			if (idx === -1) return;
			fetch(`/api/chats/${chatId}`)
				.then((r) => r.json())
				.then((updated) => {
					if (updated.title !== app.chats[idx]?.title) {
						app.chats[idx] = { ...app.chats[idx], title: updated.title };
					}
				})
				.catch(() => {});

			fetch(`/api/chats/${chatId}/messages`)
				.then((r) => r.json())
				.then((dbMsgs: Array<{ id: string; role: string; content: string }>) => {
					const sdkMsgs = chatInstance.messages;
					const newMap = new Map<string, string>();
					sdkMsgs.forEach((sdkMsg, i) => {
						const dbMsg = dbMsgs[i];
						if (dbMsg && dbMsg.role === sdkMsg.role) {
							newMap.set(sdkMsg.id, dbMsg.id);
						}
					});
					dbMessageMap = newMap;
				})
				.catch(() => {});
		}
	});

	function handleSelectionChange(messageId: string) {
		const selection = window.getSelection();
		const text = selection?.toString().trim() ?? '';
		if (text.length < 3) {
			popover = null;
			return;
		}
		const range = selection!.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		const dbId = dbMessageMap.get(messageId) ?? messageId;
		popover = { x: rect.left + rect.width / 2, y: rect.top - 8, text, messageId: dbId };
	}

	async function saveHighlight() {
		if (!popover) return;
		await app.saveHighlight(popover.messageId, popover.text);
		popover = null;
		window.getSelection()?.removeAllRanges();
	}

	// Render markdown with saved highlights visually marked
	function renderMessage(markdown: string, messageId: string): string {
		let html = marked.parse(markdown) as string;
		const dbId = dbMessageMap.get(messageId) ?? messageId;
		const msgHighlights = app.highlights.filter((h) => h.messageId === dbId);
		for (const h of msgHighlights) {
			const escaped = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			html = html.replace(
				new RegExp(escaped, 'g'),
				`<mark class="bg-warning/50 rounded px-0.5">$&</mark>`
			);
		}
		return html;
	}

	async function cloneUpToHere(messageId: string) {
		const dbId = dbMessageMap.get(messageId) ?? messageId;
		const newChatId = await app.cloneChat(chatId, dbId);
		goto(`/chat/${newChatId}`);
	}

	// Handle copy button clicks via event delegation
	function handleCopyClick(e: MouseEvent) {
		const btn = (e.target as Element).closest('.copy-btn') as HTMLElement | null;
		if (!btn) return;
		const code = decodeURIComponent(btn.dataset.code ?? '');
		navigator.clipboard.writeText(code).then(() => {
			btn.textContent = 'Copied!';
			setTimeout(() => (btn.textContent = 'Copy'), 1500);
		});
	}
</script>

{#if currentChatMetadata}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		data-testid="chat-view"
		class="flex flex-col h-full"
		onmousedown={(e) => {
			if (!(e.target as Element).closest('[data-testid="save-highlight-btn"]')) {
				popover = null;
			}
		}}
		onclick={handleCopyClick}
	>
		<div class="p-4 border-b border-base-300 flex items-center justify-between">
			<h1 data-testid="chat-view-title" class="text-xl font-bold">{currentChatMetadata.title}</h1>
			<div class="flex gap-2">
				<button
					data-testid="toggle-notes-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'notes'}
					onclick={() =>
						(app.secondaryPanelTab = app.secondaryPanelTab === 'notes' ? 'closed' : 'notes')}
					title="Notes"
				>Notes</button>
				<button
					data-testid="toggle-highlights-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'highlights'}
					onclick={() =>
						(app.secondaryPanelTab =
							app.secondaryPanelTab === 'highlights' ? 'closed' : 'highlights')}
					title="Highlights"
				>Highlights</button>
				<button
					data-testid="toggle-search-btn"
					class="btn btn-sm btn-ghost"
					class:btn-active={app.secondaryPanelTab === 'search'}
					onclick={() =>
						(app.secondaryPanelTab = app.secondaryPanelTab === 'search' ? 'closed' : 'search')}
					title="Search"
				>Search</button>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#if chatInstance.messages.length === 0}
				<div class="text-center text-base-content/50 mt-12">
					<p>No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each chatInstance.messages as message}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="group chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
						<div
							data-testid="message-bubble"
							data-message-id={message.id}
							class="chat-bubble"
							onmouseup={message.role === 'assistant'
								? () => handleSelectionChange(message.id)
								: undefined}
						>
							{#each message.parts as part}
								{#if part.type === 'text'}
									{#if message.role === 'assistant'}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html renderMessage(part.text, message.id)}
									{:else}
										{part.text}
									{/if}
								{/if}
							{/each}
						</div>
						{#if chatInstance.status !== 'streaming' && dbMessageMap.has(message.id)}
							<button
								data-testid="clone-btn"
								class="chat-footer mt-1 btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
								onclick={() => cloneUpToHere(message.id)}
								title="Clone chat up to this message"
							>
								Clone up to here
							</button>
						{/if}
					</div>
				{/each}

				{#if chatInstance.status === 'streaming' && chatInstance.messages[chatInstance.messages.length - 1]?.role === 'user'}
					<div class="chat chat-start">
						<div class="chat-bubble">
							<span class="loading loading-dots loading-sm"></span>
						</div>
					</div>
				{/if}

				<!-- Auto-scroll anchor -->
				<div bind:this={messagesEnd}></div>
			{/if}
		</div>

		<!-- Floating highlight save button -->
		{#if popover}
			<div
				class="fixed z-50 -translate-x-1/2 -translate-y-full"
				style="left: {popover.x}px; top: {popover.y}px"
			>
				<button
					data-testid="save-highlight-btn"
					class="btn btn-xs btn-warning shadow-lg"
					onclick={saveHighlight}
				>
					Save Highlight
				</button>
			</div>
		{/if}

		<div class="p-4 bg-base-200 border-t border-base-300">
			<MessageComposer
				sendMessage={(msg) => chatInstance.sendMessage(msg)}
				status={chatInstance.status}
				onStop={() => chatInstance.stop()}
			/>
		</div>
	</div>
{/if}
