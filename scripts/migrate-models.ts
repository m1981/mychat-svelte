import { db } from '../src/lib/server/db';
import { chats } from '../src/lib/server/db/schema';
import { models } from '../src/lib/config/models.config';
import { eq, inArray } from 'drizzle-orm';

async function runMigration() {
	console.log('🚀 Starting model deprecation migration...');

	let totalUpdated = 0;

	for (const model of models) {
		if (model.upgradeFrom && model.upgradeFrom.length > 0) {
			console.log(`🔍 Finding chats to upgrade to '${model.id}' from:`, model.upgradeFrom);

			// Find all chats that use one of the deprecated models
			const chatsToUpdate = await db
				.select({ id: chats.id, config: chats.config })
				.from(chats)
				.where(inArray(sql`config->'modelConfig'->>'model'`, model.upgradeFrom));

			if (chatsToUpdate.length === 0) {
				console.log('✅ No chats found for this upgrade path.');
				continue;
			}

			console.log(`Found ${chatsToUpdate.length} chats to update.`);

			// Update each chat
			for (const chat of chatsToUpdate) {
				const newConfig = {
					...(chat.config as any),
					modelConfig: {
						...((chat.config as any).modelConfig),
						model: model.id
					}
				};

				await db
					.update(chats)
					.set({ config: newConfig, updatedAt: new Date() })
					.where(eq(chats.id, chat.id));
			}
			totalUpdated += chatsToUpdate.length;
		}
	}

	console.log(`Migration complete. Total chats updated: ${totalUpdated}`);
	process.exit(0);
}

runMigration().catch((err) => {
	console.error('❌ Migration failed:', err);
	process.exit(1);
});