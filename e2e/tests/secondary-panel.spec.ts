import { test, expect } from '../fixtures';

test.describe('Secondary Panel', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) {
      await app.deleteChatViaApi(chatId).catch(() => {});
      chatId = '';
    }
  });

  test('@smoke secondary panel opens when clicking Notes button', async ({ app, page }) => {
    test.setTimeout(30000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await app.screenshot('secondary-panel-closed');

    // Panel should not be visible initially
    await expect(page.getByTestId('secondary-panel')).not.toBeVisible();

    // Click toggle button
    await page.getByTestId('toggle-notes-btn').click();

    // Panel should become visible
    await expect(page.getByTestId('secondary-panel')).toBeVisible();
    await app.screenshot('secondary-panel-open');
  });

  test('@regression note is auto-saved after typing', async ({ app, page }) => {
    test.setTimeout(30000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);

    // Open notes panel
    await page.getByTestId('toggle-notes-btn').click();
    await expect(page.getByTestId('secondary-panel')).toBeVisible();

    // Type into textarea — debounce fires after 1000ms
    await page.getByTestId('notes-textarea').fill('Integration test note');

    // Wait for the actual save request to land (debounce + network round-trip to Neon)
    // Using waitForResponse is more reliable than a fixed timeout: it resolves as soon
    // as the POST /api/notes response arrives, regardless of database latency.
    await page.waitForResponse(
      resp => resp.url().includes('/api/notes') && resp.status() === 201,
      { timeout: 8000 }
    );

    // Svelte $effects run as microtasks after the initial paint, so networkidle
    // can resolve before loadChatKnowledge even starts. Instead, wait explicitly
    // for the GET /api/notes response that loadChatKnowledge fires on mount.
    // IMPORTANT: set up the promise BEFORE reload — after reload the Svelte $effect
    // fires loadChatKnowledge immediately, and the GET may complete before we
    // register the waiter if we set it up after the await.
    const notesLoadedPromise = page.waitForResponse(
      resp => resp.url().includes('/api/notes') && resp.request().method() === 'GET',
      { timeout: 10000 }
    );

    // Reload page — use app.reload() so auth headers are re-applied to the new
    // page context; bare page.reload() can drop setExtraHTTPHeaders on some builds
    await app.reload();

    await notesLoadedPromise;

    // Re-open notes panel
    await page.getByTestId('toggle-notes-btn').click();
    await expect(page.getByTestId('secondary-panel')).toBeVisible();

    // Assert note content is persisted
    await expect(page.getByTestId('notes-textarea')).toHaveValue('Integration test note');
    await app.screenshot('note-after-reload');
  });

  test('@regression highlight is saved from text selection', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    // Send message and wait for AI response
    await chat.sendMessage('Say exactly: Hello World');

    // Wait for AI response bubble to appear
    await expect(chat.messageBubbles).toHaveCount(2, { timeout: 60000 });
    await expect(chat.composerInput).toBeEnabled({ timeout: 60000 });

    // Allow time for post-streaming DB message ID fetch to complete
    await page.waitForTimeout(1000);

    await app.screenshot('highlight-before-selection');

    // Select text in the assistant message bubble using evaluate
    const assistantBubble = page.locator('[data-testid="message-bubble"]').nth(1);
    await assistantBubble.waitFor({ state: 'visible' });

    await page.evaluate(() => {
      const bubbles = document.querySelectorAll('[data-testid="message-bubble"]');
      // Select the second bubble (assistant message)
      const assistantEl = bubbles[1];
      if (assistantEl) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(assistantEl);
        selection?.removeAllRanges();
        selection?.addRange(range);
        // Trigger mouseup to fire selection handler
        assistantEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    });

    // Assert save highlight button appears
    await expect(page.getByTestId('save-highlight-btn')).toBeVisible({ timeout: 5000 });
    await app.screenshot('highlight-popover');

    // Click save highlight
    await page.getByTestId('save-highlight-btn').click();

    // Open highlights tab
    await page.getByTestId('toggle-highlights-btn').click();
    await expect(page.getByTestId('secondary-panel')).toBeVisible();

    // Assert at least one highlight item
    await expect(page.getByTestId('highlight-item')).toHaveCount(1, { timeout: 5000 });
    await app.screenshot('highlight-saved');
  });
});
