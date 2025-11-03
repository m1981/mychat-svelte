<script lang="ts">
	import { createAttachment, deleteAttachment } from '$lib/stores/attachment.store';
	import type { Attachment, AttachmentType } from '$lib/types/chat';

	interface Props {
		attachments: Attachment[];
		chatId?: string;
	}

	let { attachments, chatId }: Props = $props();

	let showAddUrl = $state(false);
	let newUrl = $state('');

	async function handleAddUrl() {
		if (!newUrl.trim() || !chatId) return;

		await createAttachment({
			chatId,
			type: 'URL',
			content: newUrl.trim()
		});

		newUrl = '';
		showAddUrl = false;
	}

	async function handleDelete(id: string) {
		if (confirm('Delete this attachment?')) {
			await deleteAttachment(id);
		}
	}

	function getAttachmentIcon(type: AttachmentType): string {
		switch (type) {
			case 'FILE':
				return '📄';
			case 'IMAGE':
				return '🖼️';
			case 'URL':
				return '🔗';
			default:
				return '📎';
		}
	}
</script>

<div class="attachments-list flex flex-col gap-3 h-full">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold">Attachments</h3>
		{#if chatId}
			<button
				class="btn btn-xs btn-ghost"
				onclick={() => (showAddUrl = !showAddUrl)}
				title="Add URL"
			>
				{showAddUrl ? '✕' : '+'}
			</button>
		{/if}
	</div>

	{#if showAddUrl && chatId}
		<div class="card bg-base-200 p-3 space-y-2">
			<input
				type="url"
				bind:value={newUrl}
				class="input input-sm input-bordered w-full"
				placeholder="Enter URL..."
			/>
			<div class="flex gap-2">
				<button class="btn btn-primary btn-xs" onclick={handleAddUrl}>Add</button>
				<button class="btn btn-ghost btn-xs" onclick={() => (showAddUrl = false)}>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	{#if attachments.length === 0}
		<div class="text-sm text-base-content/50 text-center py-8">No attachments yet</div>
	{:else}
		<div class="space-y-2 flex-1 overflow-y-auto">
			{#each attachments as attachment (attachment.id)}
				<div class="card bg-base-200 p-3 flex-row items-center gap-3">
					<span class="text-2xl">{getAttachmentIcon(attachment.type)}</span>
					<div class="flex-1 min-w-0">
						{#if attachment.type === 'URL'}
							<a
								href={attachment.content}
								target="_blank"
								rel="noopener noreferrer"
								class="link link-primary text-sm truncate block"
							>
								{attachment.content}
							</a>
						{:else}
							<p class="text-sm truncate">
								{attachment.metadata?.filename || attachment.content}
							</p>
						{/if}
						<p class="text-xs text-base-content/50">
							{new Date(attachment.createdAt).toLocaleDateString()}
						</p>
					</div>
					<button
						class="btn btn-ghost btn-xs text-error"
						onclick={() => handleDelete(attachment.id)}
						title="Delete"
					>
						🗑️
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
