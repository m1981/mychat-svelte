<script lang="ts">
  // ChatContext: Groups related stores into a single derived context
  // Reduces global store imports in child components; provides scoped chat data
  import { setContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { notes } from '$lib/stores/note.store';
  import { highlights } from '$lib/stores/highlight.store';
  import { attachments } from '$lib/stores/attachment.store';
  import type { Note } from '$lib/types/note';
  import type { Highlight } from '$lib/types/highlight';
  import type { Attachment } from '$lib/types/attachment';

  // Derived store grouping chat-related state (notes, highlights, attachments)
  // Components can subscribe to this single context instead of importing multiple stores
  const chatStores = derived(
    [notes, highlights, attachments],
    ([$notes, $highlights, $attachments]) => ({
      notes: $notes,
      highlights: $highlights,
      attachments: $attachments,
      // Derived convenience: e.g., totalItems for UI
      totalItems: $notes.length + $highlights.length + $attachments.length
    })
  );

  // Set context for child components (e.g., NotesPanel, HighlightsPanel)
  setContext('chatStores', chatStores);

  let { children } = $props();
</script>

{@render children()}