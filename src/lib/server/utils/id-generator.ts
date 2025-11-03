/**
 * Simple ID generator using timestamp and random string
 * Generates IDs like: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n"
 */
export function generateId(): string {
	const timestamp = Date.now().toString(36);
	const randomStr = Math.random().toString(36).substring(2, 15);
	return (timestamp + randomStr).substring(0, 32);
}

/**
 * Generate a unique ID for testing purposes
 * @param prefix Optional prefix for the ID
 */
export function generateTestId(prefix = 'test'): string {
	return `${prefix}_${generateId()}`;
}
