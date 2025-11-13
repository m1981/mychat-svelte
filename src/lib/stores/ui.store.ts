import { writable } from 'svelte/store';

export const hideSideMenu = writable(false);

// Secondary panel state
export const secondaryPanelTab = writable<'highlights' | 'notes' | 'attachments'>('highlights');
export const showSecondaryPanel = writable(true);