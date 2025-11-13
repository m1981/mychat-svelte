import { chromium, FullConfig } from '@playwright/test';
import postgres from 'postgres';

/**
 * Global setup for Playwright tests
 * Seeds the database with test user before running tests
 */
async function globalSetup(config: FullConfig) {
	console.log('🌱 Seeding test database...');

	// Get database URL from environment
	const databaseUrl =
		process.env.DATABASE_URL ||
		'postgresql://postgres.auaaxpahcopuwshfhefs:HWEpKd1QXC823S23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

	// Connect to database
	const sql = postgres(databaseUrl);

	try {
		// Clean up existing test data
		console.log('🧹 Cleaning up existing test data...');
		await sql`DELETE FROM users WHERE email = 'test@example.com'`;

		// Insert test user with ID 1
		console.log('👤 Creating test user...');
		await sql`
			INSERT INTO users (id, email, created_at)
			VALUES (1, 'test@example.com', NOW())
			ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
		`;

		// Reset the sequence to ensure the next auto-generated ID is > 1
		await sql`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`;

		console.log('✅ Test database seeded successfully');
	} catch (error) {
		console.error('❌ Failed to seed test database:', error);
		throw error;
	} finally {
		await sql.end();
	}
}

export default globalSetup;
