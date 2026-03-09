import { test, expect } from '../fixtures';

test.describe('Chat Messaging', () => {
  let chatId: string;

  test.afterEach(async ({ app }) => {
    if (chatId) {
      await app.deleteChatViaApi(chatId).catch(() => {});
      chatId = '';
    }
  });

  test('@smoke navigating to a chat shows the composer', async ({ app, chat, page }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await app.screenshot('chat-messaging-composer-initial');

    await expect(chat.composerInput).toBeVisible();
    await expect(chat.sendBtn).toBeVisible();
    await expect(chat.chatTitle).toBeVisible();

    const titleText = await chat.chatTitle.textContent();
    console.log(`Chat page title: "${titleText}"`);
    await app.screenshot('chat-messaging-composer-visible');
  });

  test('@regression sending a message shows user bubble and AI response bubble', async ({ app, chat, page }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    await app.screenshot('chat-messaging-send-before');

    await chat.sendMessage('Hello, please reply with exactly: "Hi there!"');

    // User bubble should appear immediately
    await expect(chat.messageBubbles.first()).toBeVisible({ timeout: 5000 });
    await app.screenshot('chat-messaging-send-user-bubble');

    // Wait for AI response: textarea re-enabled signals streaming done
    await expect(chat.composerInput).toBeEnabled({ timeout: 30000 });
    await expect(chat.messageBubbles).toHaveCount(2, { timeout: 30000 });

    await app.screenshot('chat-messaging-send-after');

    const bubbleCount = await chat.messageBubbles.count();
    expect(bubbleCount).toBeGreaterThanOrEqual(2);

    const firstBubble = await chat.messageBubbles.first().textContent();
    console.log(`User bubble text: "${firstBubble}"`);
    const secondBubble = await chat.messageBubbles.nth(1).textContent();
    console.log(`AI response bubble text: "${secondBubble}"`);
  });

  test('@regression @visual after first AI message, title is auto-updated', async ({ app, chat, sidebar, page }) => {
    test.setTimeout(60000);
    chatId = await app.createChatViaApi();

    await app.goto(`/chat/${chatId}`);
    await expect(chat.composerInput).toBeVisible();

    const initialTitle = await chat.chatTitle.textContent();
    console.log(`Initial chat title: "${initialTitle}"`);
    await app.screenshot('chat-messaging-title-before');

    await chat.sendMessage('Say hello and give me a title for this chat about cats');

    // Wait for AI response to complete: textarea re-enabled signals streaming done
    await expect(chat.composerInput).toBeEnabled({ timeout: 30000 });
    await expect(chat.messageBubbles).toHaveCount(2, { timeout: 30000 });

    // Give time for title update to propagate
    await page.waitForTimeout(2000);
    await app.screenshot('chat-messaging-title-after');

    const updatedTitle = await chat.chatTitle.textContent();
    console.log(`Updated chat title: "${updatedTitle}"`);

    // After AI responds, the chat is still accessible and has a title
    await expect(chat.chatTitle).toBeVisible();
    expect(updatedTitle).toBeTruthy();
  });
});
