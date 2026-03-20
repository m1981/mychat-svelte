/**
 * E2E tests for Phase 6 Destructive Regeneration.
 * Editing a past user message truncates everything after it and re-streams.
 */
import { test, expect } from '../fixtures';

test.describe('Destructive Regeneration', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) await app.deleteChatViaApi(chatId).catch(() => {});
    chatId = '';
  });

  test('@smoke Edit button appears on hover for user messages only', async ({ app, chat }) => {
    test.setTimeout(5000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await chat.sendMessage('Say only: hello');
    await chat.waitForResponse(5000);

    // Wait for dbMessageMap to populate (edit btn appears)
    const userBubble = chat.messageBubbles.first();
    const editBtn = userBubble.locator('..').locator('[data-testid="edit-btn"]');
    await expect(editBtn).toBeAttached({ timeout: 10000 });

    // Verify the opacity wrapper has the hiding class (opacity-0 is on the parent div)
    const wrapper = editBtn.locator('..');
    const wrapperCls = await wrapper.getAttribute('class');
    expect(wrapperCls).toContain('opacity-0');

    // Hovering reveals it
    await userBubble.hover();
    await expect(editBtn).toBeVisible();

    // Assistant bubble should NOT have an edit button
    const assistantBubble = chat.messageBubbles.last();
    const assistantEditBtn = assistantBubble.locator('..').locator('[data-testid="edit-btn"]');
    await expect(assistantEditBtn).not.toBeAttached();

    await app.screenshot('regenerate-edit-btn-hover');
  });

  test('@smoke clicking Edit replaces bubble with editable textarea', async ({ app, chat, page }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await chat.sendMessage('Say only: original');
    await chat.waitForResponse(30000);

    const userBubble = chat.messageBubbles.first();
    await userBubble.hover();

    const editBtn = userBubble.locator('..').locator('[data-testid="edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Textarea replaces the bubble
    const editInput = page.getByTestId('edit-input');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Say only: original');

    // Cancel + Regenerate buttons are present
    await expect(page.getByTestId('edit-cancel-btn')).toBeVisible();
    await expect(page.getByTestId('edit-confirm-btn')).toBeVisible();

    await app.screenshot('regenerate-edit-open');
  });

  test('@regression Cancel restores the original bubble', async ({ app, chat, page }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await chat.sendMessage('Say only: cancel test');
    await chat.waitForResponse(30000);

    const userBubble = chat.messageBubbles.first();
    await userBubble.hover();

    const editBtn = userBubble.locator('..').locator('[data-testid="edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    await expect(page.getByTestId('edit-input')).toBeVisible();
    await page.getByTestId('edit-cancel-btn').click();

    // Bubble is restored — original text still visible
    await expect(page.getByTestId('edit-input')).not.toBeVisible();
    await expect(userBubble).toContainText('Say only: cancel test');

    await app.screenshot('regenerate-cancel');
  });

  test('@regression confirming edit truncates history and re-streams', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);

    // First exchange
    await chat.sendMessage('Say only: first message');
    await chat.waitForResponse(30000);

    // Second exchange
    await chat.sendMessage('Say only: second message');
    await chat.waitForResponse(30000, 4);

    // 4 bubbles: user1, assistant1, user2, assistant2
    await expect(chat.messageBubbles).toHaveCount(4, { timeout: 5000 });

    // Edit the FIRST user message
    const firstBubble = chat.messageBubbles.first();
    await firstBubble.hover();

    const editBtn = firstBubble.locator('..').locator('[data-testid="edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    const editInput = page.getByTestId('edit-input');
    await editInput.fill('Say only: edited message');

    await app.screenshot('regenerate-before-confirm');

    await page.getByTestId('edit-confirm-btn').click();

    // After truncation + re-stream: should settle back to 2 bubbles
    // (edited user + new assistant); old user2 + assistant2 are gone
    await expect(chat.messageBubbles).toHaveCount(2, { timeout: 30000 });
    await expect(chat.composerInput).toBeEnabled({ timeout: 30000 });

    // New user bubble has edited text
    await expect(chat.messageBubbles.first()).toContainText('Say only: edited message');

    await app.screenshot('regenerate-after-confirm');
  });
});
