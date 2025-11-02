import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	out: './drizzle',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
	},
	verbose: true,
	strict: true
});
