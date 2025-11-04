export interface Tag {
	id: string;
	userId?: number;
	name: string;
	color?: string;
	type: 'CHAT' | 'MESSAGE' | 'NOTE';
	createdAt: Date;
}

export interface CreateTagDTO {
	userId: number;
	name: string;
	color?: string;
	type: 'CHAT' | 'MESSAGE' | 'NOTE';
}
