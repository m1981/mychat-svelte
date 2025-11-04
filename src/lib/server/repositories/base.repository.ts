/**
 * Base repository interface with common CRUD operations
 */
export interface BaseRepository<T, CreateDTO, UpdateDTO> {
	create(data: CreateDTO): Promise<T>;
	findById(id: string | number, userId?: number): Promise<T | null>;
	update(id: string | number, userId: number, data: UpdateDTO): Promise<T>;
	delete(id: string | number, userId: number): Promise<void>;
}

/**
 * Helper to generate unique IDs with prefix
 */
export function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
