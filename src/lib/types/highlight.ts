export interface Highlight {
	id: string;
	messageId: string;
	text: string;
	startOffset: number;
	endOffset: number;
	color: string;
	note?: string;
	createdAt: Date;
}

export interface CreateHighlightDTO {
	messageId: string;
	text: string;
	startOffset: number;
	endOffset: number;
	color?: string;
	note?: string;
}

export interface UpdateHighlightDTO {
	color?: string;
	note?: string;
}
