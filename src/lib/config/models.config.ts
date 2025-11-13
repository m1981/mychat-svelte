export interface AIModel {
	id: string; // e.g., 'claude-3.5-sonnet'
	name: string; // User-facing name, e.g., "Claude 3.5 Sonnet"
	provider: 'anthropic' | 'openai';
	contextWindow: number;
	// This is the key: map old, deprecated models to this new one.
	upgradeFrom?: string[];
}

export const models: AIModel[] = [
	{
		id: 'claude-3-5-sonnet-20240620',
		name: 'Claude 3.5 Sonnet',
		provider: 'anthropic',
		contextWindow: 200000,
		// When a chat uses the old model, it will be automatically upgraded to this one.
		upgradeFrom: ['claude-3-7-sonnet-20250219', 'claude-3-sonnet-20240229']
	},
	{
		id: 'gpt-4o',
		name: 'GPT-4o',
		provider: 'openai',
		contextWindow: 128000
	}
	// Add other models here
];

// Define the default model for new chats
export const DEFAULT_ANTHROPIC_MODEL_ID = 'claude-3-5-sonnet-20240620';
export const DEFAULT_OPENAI_MODEL_ID = 'gpt-4o';

/**
 * Resolves a model ID, upgrading it if it's deprecated.
 * This function is the heart of the dynamic upgrade strategy.
 * @param provider The provider of the chat config.
 * @param modelId The model ID from the chat's saved config.
 * @returns The current, valid model ID.
 */
export function resolveModel(provider: 'anthropic' | 'openai', modelId: string): string {
	const newModel = models.find(m => m.upgradeFrom?.includes(modelId));

	// If an upgrade path is found, return the new model's ID.
	if (newModel) {
		console.warn(`Model '${modelId}' is deprecated. Upgrading to '${newModel.id}'.`);
		return newModel.id;
	}

	// If the model is still valid or not found in any upgrade path, return it as is.
	return modelId;
}