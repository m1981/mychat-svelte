import { vi } from 'vitest';

// Mock the database module to prevent actual DB connections during testing
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]),
					orderBy: vi.fn().mockResolvedValue([])
				}),
				orderBy: vi.fn().mockResolvedValue([]),
				limit: vi.fn().mockResolvedValue([])
			})
		}),
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]),
				onConflictDoNothing: vi.fn().mockResolvedValue(undefined)
			})
		}),
		update: vi.fn().mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([])
				})
			})
		}),
		delete: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue({ rowCount: 1 })
		}),
		selectDistinct: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				innerJoin: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([])
				})
			})
		}),
		execute: vi.fn().mockResolvedValue({ rows: [] }),
		transaction: vi.fn().mockImplementation((callback) => callback({
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined)
				})
			})
		}))
	}
}));

// Mock the environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: 'postgresql://test:test@localhost:5432/test'
	}
}));
