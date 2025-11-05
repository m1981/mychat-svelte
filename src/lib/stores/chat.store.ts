import { writable } from 'svelte/store';
import type { Chat, FolderCollection } from '$lib/types/chat';

// Initialize with empty data - will be populated from server on load
export const chats = writable<Chat[]>([]);
export const folders = writable<FolderCollection>({});
export const currentChatIndex = writable<number>(0);
export const generating = writable<boolean>(false);