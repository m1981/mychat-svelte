<script lang="ts">
	import { notes } from '$lib/stores/note.store';
	import { highlights } from '$lib/stores/highlight.store';
	import { attachments } from '$lib/stores/attachment.store';
	import HighlightsList from '$lib/components/sidebar/HighlightsList.svelte';
	import NotesList from '$lib/components/sidebar/NotesList.svelte';
	import AttachmentsList from '$lib/components/sidebar/AttachmentsList.svelte';

	interface Props {
		chatId?: string;
		messageIds?: string[];
	}

	let { chatId, messageIds = [] }: Props = $props();

	let activeTab = $state<'highlights' | 'notes' | 'attachments'>('highlights');

	// Filter data by current chat/messages
	const currentHighlights = $derived(
		messageIds.length > 0
			? $highlights.filter((h) => messageIds.includes(h.messageId))
			: []
	);

	const currentNotes = $derived(chatId ? $notes.filter((n) => n.chatId === chatId) : []);

	const currentAttachments = $derived(
		chatId ? $attachments.filter((a) => a.chatId === chatId) : []
	);
</script>

<aside class="w-80 bg-base-100 border-l border-base-300 flex flex-col overflow-hidden">
	<!-- Tabs -->
	<div class="tabs tabs-boxed p-2 bg-base-200 flex-shrink-0">
		<button
			class="tab flex-1 {activeTab === 'highlights' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'highlights')}
		>
			🖍️ Highlights
			{#if currentHighlights.length > 0}
				<span class="badge badge-sm ml-1">{currentHighlights.length}</span>
			{/if}
		</button>
		<button
			class="tab flex-1 {activeTab === 'notes' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'notes')}
		>
			📝 Notes
			{#if currentNotes.length > 0}
				<span class="badge badge-sm ml-1">{currentNotes.length}</span>
			{/if}
		</button>
		<button
			class="tab flex-1 {activeTab === 'attachments' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'attachments')}
		>
			📎 Files
			{#if currentAttachments.length > 0}
				<span class="badge badge-sm ml-1">{currentAttachments.length}</span>
			{/if}
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-hidden p-4">
		{#if activeTab === 'highlights'}
			<HighlightsList highlights={currentHighlights} />
		{:else if activeTab === 'notes'}
			<NotesList notes={currentNotes} {chatId} />
		{:else if activeTab === 'attachments'}
			<AttachmentsList attachments={currentAttachments} {chatId} />
		{/if}
	</div>
</aside>

<style>
	aside {
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
	}
</style>
