/**
 * E2E tests for Phase 6 Multi-Model Selector.
 * Users can switch the AI model per-chat from the header dropdown.
 */
import { test, expect } from '../fixtures';

test.describe('Model Selector', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) await app.deleteChatViaApi(chatId).catch(() => {});
    chatId = '';
  });

  test('@smoke selector is visible in chat header with correct default', async ({ app, page }) => {
    chatId = await app.createChatViaApi();
    await app.goto(`/chat/${chatId}`);

    const selector = page.getByTestId('model-selector');
    await expect(selector).toBeVisible();
    await expect(selector).toHaveValue('claude-sonnet-4-6');

    await app.screenshot('model-selector-default');
  });

  test('@smoke switching model updates selector and persists', async ({ app, page }) => {
    chatId = await app.createChatViaApi();
    await app.goto(`/chat/${chatId}`);

    const selector = page.getByTestId('model-selector');

    // Wait for the PATCH to complete before reloading
    const patchDone = page.waitForResponse((r) => r.url().includes(`/api/chats/${chatId}`) && r.request().method() === 'PATCH');
    await selector.selectOption('claude-haiku-4-5-20251001');
    await patchDone;

    await expect(selector).toHaveValue('claude-haiku-4-5-20251001');

    // Reload to confirm persistence
    await page.reload();
    await expect(page.getByTestId('model-selector')).toHaveValue('claude-haiku-4-5-20251001');

    await app.screenshot('model-selector-switched');
  });

  test('@regression selector is disabled while streaming', async ({ app, chat, page }) => {
    chatId = await app.createChatViaApi();
    await app.goto(`/chat/${chatId}`);

    await chat.sendMessage('Say only: hello');

    // Selector should be disabled during streaming
    const selector = page.getByTestId('model-selector');
    await expect(selector).toBeDisabled({ timeout: 5000 });

    // Re-enabled after stream completes
    await chat.waitForResponse(30000);
    await expect(selector).toBeEnabled();

    await app.screenshot('model-selector-streaming');
  });
});
