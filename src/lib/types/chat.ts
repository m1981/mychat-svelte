export interface ModelConfig {
	model: string;
	max_tokens: number;
	temperature: number;
	top_p: number;
	presence_penalty: number;
	frequency_penalty: number;
}

export interface ChatConfig {
	provider: 'openai' | 'anthropic';
	modelConfig: ModelConfig;
}

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface Chat {
	id: string;
	title: string;
	messages: Message[];
	config: ChatConfig;
	folder?: string;
}

export interface Folder {
	id:string;
	name: string;
	expanded: boolean;
	order: number;
	color?: string;
}

export type FolderCollection = Record<string, Folder>;