/**
 * E2E tests for Phase 6 "Clone up to here" feature.
 * Verifies the clone button is visible on hover and produces a navigable clone.
 */
import { test, expect } from '../fixtures';

test.describe('Clone Chat', () => {
  let sourceChatId: string;
  let clonedChatId: string;

  test.afterEach(async ({ app }) => {
    if (sourceChatId) await app.deleteChatViaApi(sourceChatId).catch(() => {});
    if (clonedChatId) await app.deleteChatViaApi(clonedChatId).catch(() => {});
    sourceChatId = '';
    clonedChatId = '';
  });

  test('@smoke clone button is hidden by default and visible on hover', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    sourceChatId = await app.createChatViaApi();

    await app.goto(`/chat/${sourceChatId}`);
    await chat.sendMessage('Say only: hello');
    await chat.waitForResponse(60000);

    const firstBubble = chat.messageBubbles.first();
    const cloneBtn = firstBubble.locator('..').locator('[data-testid="clone-btn"]');

    // Button appears once dbMessageMap is populated (async after streaming completes)
    await expect(cloneBtn).toBeAttached({ timeout: 10000 });

    // Hover over the message row to reveal the button (opacity-0 → opacity-100)
    await firstBubble.hover();
    await expect(cloneBtn).toBeVisible();

    await app.screenshot('clone-btn-hover');
  });

  test('@regression clicking clone navigates to new chat with same messages', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    sourceChatId = await app.createChatViaApi();

    await app.goto(`/chat/${sourceChatId}`);
    await chat.sendMessage('Say only: clone test');
    await chat.waitForResponse(60000);

    // We have 2 messages: user + assistant. Clone up to the assistant (last) message.
    const bubbles = chat.messageBubbles;
    const count = await bubbles.count();
    expect(count).toBe(2);

    const lastBubble = bubbles.last();
    await lastBubble.hover();

    const cloneBtn = lastBubble.locator('..').locator('[data-testid="clone-btn"]');
    await expect(cloneBtn).toBeVisible({ timeout: 3000 });

    await app.screenshot('clone-btn-before-click');

    await cloneBtn.click();

    // Should navigate to a DIFFERENT chat (not the source)
    await page.waitForURL(
      (url) => url.pathname.startsWith('/chat/') && !url.pathname.includes(sourceChatId),
      { timeout: 15000 }
    );
    clonedChatId = page.url().split('/chat/')[1];
    expect(clonedChatId).toBeTruthy();
    expect(clonedChatId).not.toBe(sourceChatId);

    // Cloned chat should show the same number of messages
    await expect(chat.messageBubbles).toHaveCount(2, { timeout: 10000 });

    // Title should indicate it's a clone
    const title = await chat.chatTitle.textContent();
    expect(title).toMatch(/\(clone\)/);

    await app.screenshot('clone-after-navigate');
  });

  test('@smoke cloning up to first message gives a chat with one message', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    sourceChatId = await app.createChatViaApi();

    await app.goto(`/chat/${sourceChatId}`);
    await chat.sendMessage('Say only: truncation test');
    await chat.waitForResponse(60000);

    // Hover over the FIRST message (user) and clone up to it
    const firstBubble = chat.messageBubbles.first();
    await firstBubble.hover();

    const cloneBtn = firstBubble.locator('..').locator('[data-testid="clone-btn"]');
    await expect(cloneBtn).toBeVisible({ timeout: 3000 });
    await cloneBtn.click();

    await page.waitForURL(
      (url) => url.pathname.startsWith('/chat/') && !url.pathname.includes(sourceChatId),
      { timeout: 15000 }
    );
    clonedChatId = page.url().split('/chat/')[1];

    // Only the first (user) message should be present
    await expect(chat.messageBubbles).toHaveCount(1, { timeout: 10000 });

    await app.screenshot('clone-truncated');
  });
});
