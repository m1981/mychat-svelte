import postgres from 'postgres';

/**
 * Global teardown for Playwright tests
 * Cleans up test data after all tests complete
 */
async function globalTeardown() {
	console.log('🧹 Cleaning up test database...');

	// Get database URL from environment
	const databaseUrl =
		process.env.DATABASE_URL ||
		'postgresql://postgres.auaaxpahcopuwshfhefs:HWEpKd1QXC823S23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

	// Connect to database
	const sql = postgres(databaseUrl);

	try {
		// Clean up test user and all related data (cascade will handle related records)
		await sql`DELETE FROM users WHERE email = 'test@example.com'`;

		console.log('✅ Test database cleaned up successfully');
	} catch (error) {
		console.error('❌ Failed to cleanup test database:', error);
		throw error;
	} finally {
		await sql.end();
	}
}

export default globalTeardown;
