import type { Tag } from './chat';

export interface SearchQuery {
	query?: string;
	mode: 'text' | 'semantic' | 'hybrid';
	filters?: SearchFilters;
	pagination?: PaginationParams;
}

export interface SearchFilters {
	chatIds?: string[];
	folderIds?: string[];
	tags?: string[];
	dateFrom?: Date;
	dateTo?: Date;
	types?: ('chat' | 'message' | 'note')[];
	minScore?: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface SearchResult {
	type: 'chat' | 'message' | 'note';
	id: string;
	chatId: string;
	chatTitle: string;
	title?: string;
	snippet: string;
	content: string;
	score: number;
	highlights: string[];
	metadata: SearchResultMetadata;
}

export interface SearchResultMetadata {
	createdAt: Date;
	tags?: Tag[];
	messageRole?: 'user' | 'assistant';
	folderId?: string;
	folderName?: string;
}

export interface SearchResponse {
	results: SearchResult[];
	pagination: PaginationResponse;
	took: number;
}

export interface PaginationResponse {
	page: number;
	limit: number;
	total: number;
	hasMore: boolean;
}
