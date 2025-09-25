import { writable } from 'svelte/store';
import type { Chat, FolderCollection } from '$lib/types/chat';

// Sample data for demonstration purposes
const sampleChats: Chat[] = [
	{ id: 'chat-1', title: 'New Chat 1', folder: 'folder-1', messages: [], config: { provider: 'anthropic', modelConfig: { model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, temperature: 0.7, top_p: 1, presence_penalty: 0, frequency_penalty: 0 } } },
	{ id: 'chat-2', title: 'New Chat 2', folder: 'folder-2', messages: [], config: { provider: 'anthropic', modelConfig: { model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, temperature: 0.7, top_p: 1, presence_penalty: 0, frequency_penalty: 0 } } },
	{ id: 'chat-3', title: 'New Chat 3', folder: 'folder-2', messages: [], config: { provider: 'anthropic', modelConfig: { model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, temperature: 0.7, top_p: 1, presence_penalty: 0, frequency_penalty: 0 } } },
	{ id: 'chat-4', title: 'New Chat 4', folder: 'folder-3', messages: [], config: { provider: 'anthropic', modelConfig: { model: 'claude-3-7-sonnet-20250219', max_tokens: 4096, temperature: 0.7, top_p: 1, presence_penalty: 0, frequency_penalty: 0 } } },
];

const sampleFolders: FolderCollection = {
	'folder-1': { id: 'folder-1', name: 'New Folder 1', expanded: true, order: 0, color: '#3b82f6' },
	'folder-2': { id: 'folder-2', name: 'New Folder 2', expanded: true, order: 1, color: '#3b82f6' },
	'folder-3': { id: 'folder-3', name: 'New Folder 3', expanded: true, order: 2, color: '#3b82f6' },
};


export const chats = writable<Chat[]>(sampleChats);
export const folders = writable<FolderCollection>(sampleFolders);
export const currentChatIndex = writable<number>(0);
export const generating = writable<boolean>(false);