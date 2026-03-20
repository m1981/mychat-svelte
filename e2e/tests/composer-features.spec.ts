/**
 * Tests for Phase 6 composer features introduced in the uncommitted changes:
 *  1. Stop-streaming button — appears while streaming, aborts on click
 *  2. File drop — dropping a .txt/.md file appends its content to the textarea
 *  3. Syntax highlighting — AI code-block responses render with hljs classes + Copy button
 */
import { test, expect } from '../fixtures';

// ---------------------------------------------------------------------------
// Stop-streaming button
// ---------------------------------------------------------------------------
test.describe('Stop Streaming Button', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) await app.deleteChatViaApi(chatId).catch(() => {});
    chatId = '';
  });

  test('@smoke stop button appears while AI is streaming', async ({ app, chat }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    // Send a prompt that reliably produces a long response
    await chat.composerInput.fill('Count slowly from 1 to 50, one number per line.');
    await chat.sendBtn.click();

    // Stop button must appear before the stream ends
    await expect(chat.stopBtn).toBeVisible({ timeout: 10000 });
    // Send button must NOT be visible at the same time
    await expect(chat.sendBtn).not.toBeVisible();

    await app.screenshot('stop-btn-visible');
  });

  test('@regression clicking stop button aborts the stream and re-shows send button', async ({ app, chat }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.composerInput.fill('Count slowly from 1 to 100, one number per line.');
    await chat.sendBtn.click();

    // Wait for streaming to start
    await expect(chat.stopBtn).toBeVisible({ timeout: 10000 });

    // Abort
    await chat.stopBtn.click();

    // After abort: send button returns and textarea is re-enabled
    await expect(chat.sendBtn).toBeVisible({ timeout: 10000 });
    await expect(chat.composerInput).toBeEnabled({ timeout: 5000 });

    // At least the user bubble exists; a partial AI bubble may or may not be
    // present depending on how many tokens arrived before stop() took effect.
    const count = await chat.messageBubbles.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await app.screenshot('stop-btn-after-abort');
  });
});

// ---------------------------------------------------------------------------
// File drop into composer
// ---------------------------------------------------------------------------
test.describe('File Drop into Composer', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) await app.deleteChatViaApi(chatId).catch(() => {});
    chatId = '';
  });

  test('@smoke dropping a .txt file appends its content to the textarea', async ({ app, chat }) => {
    test.setTimeout(30000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.dropTextFile('notes.txt', 'Hello from dropped file');

    // Textarea should now contain the file header and content
    const value = await chat.composerInput.inputValue();
    expect(value).toContain('--- File: notes.txt ---');
    expect(value).toContain('Hello from dropped file');

    await app.screenshot('file-drop-txt');
  });

  test('@smoke dropping a .md file appends its content to the textarea', async ({ app, chat }) => {
    test.setTimeout(30000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.dropTextFile('readme.md', '# My README\nsome content');

    const value = await chat.composerInput.inputValue();
    expect(value).toContain('--- File: readme.md ---');
    expect(value).toContain('# My README');

    await app.screenshot('file-drop-md');
  });

  test('@regression dropped file content can be sent as a message', async ({ app, chat }) => {
    test.setTimeout(30000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.dropTextFile('context.txt', 'Project context: this is a test file');

    // Send button should be enabled now (textarea is non-empty)
    await expect(chat.sendBtn).not.toBeDisabled();

    await app.screenshot('file-drop-send-enabled');
  });
});

// ---------------------------------------------------------------------------
// Syntax highlighting + Copy button
// ---------------------------------------------------------------------------
test.describe('Syntax Highlighting & Copy Button', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) await app.deleteChatViaApi(chatId).catch(() => {});
    chatId = '';
  });

  test('@regression AI code block response is rendered with hljs classes', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    // Ask for a short code snippet to guarantee a fenced code block in the response
    await chat.sendMessage(
      'Reply with only a JavaScript hello world in a fenced code block, no explanation.'
    );

    await chat.waitForResponse(60000);

    // The custom renderer wraps code blocks in .code-block divs
    await expect(chat.codeBlocks.first()).toBeVisible({ timeout: 5000 });

    // hljs adds a language class like "hljs language-javascript"
    const codeEl = page.locator('.code-block code').first();
    await expect(codeEl).toBeVisible();
    const classes = await codeEl.getAttribute('class');
    expect(classes).toMatch(/hljs/);

    await app.screenshot('code-block-hljs');
  });

  test('@regression Copy button is present inside each code block', async ({ app, chat }) => {
    test.setTimeout(90000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.sendMessage(
      'Reply with only a Python hello world in a fenced code block, no explanation.'
    );

    await chat.waitForResponse(60000);

    // Copy button should exist inside the code block
    const copyBtn = chat.codeBlocks.first().locator('.copy-btn');
    await expect(copyBtn).toBeAttached();

    // Button must carry the encoded source code in its data-code attribute
    const dataCode = await copyBtn.getAttribute('data-code');
    expect(dataCode).toBeTruthy();
    const decoded = decodeURIComponent(dataCode!);
    expect(decoded.length).toBeGreaterThan(0);

    await app.screenshot('code-block-copy-btn');
  });

  test('@smoke Copy button shows "Copied!" feedback on click', async ({ app, chat, page }) => {
    test.setTimeout(90000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await chat.sendMessage(
      'Reply with only a TypeScript hello world in a fenced code block, no explanation.'
    );

    await chat.waitForResponse(60000);

    const copyBtn = chat.codeBlocks.first().locator('.copy-btn');
    await expect(copyBtn).toBeAttached();

    // Grant clipboard permission and click the button
    await page.context().grantPermissions(['clipboard-write']);
    await copyBtn.hover(); // copy-btn is opacity-0 until hover
    await copyBtn.click({ force: true });

    // Button text changes to "Copied!" for 1500ms
    await expect(copyBtn).toHaveText('Copied!', { timeout: 3000 });

    await app.screenshot('code-block-copied-feedback');
  });
});
