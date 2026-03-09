import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ChatPage {
  constructor(readonly page: Page) {}

  get composerInput() { return this.page.getByTestId('message-input'); }
  get sendBtn() { return this.page.getByTestId('send-btn'); }
  get chatTitle() { return this.page.getByTestId('chat-view-title'); }
  get messageBubbles() { return this.page.getByTestId('message-bubble'); }

  async sendMessage(text: string) {
    await this.composerInput.fill(text);
    await this.sendBtn.click();
  }

  async waitForResponse() {
    // Wait for user bubble to appear first
    await expect(this.messageBubbles.first()).toBeVisible({ timeout: 10000 });
    // Then wait for AI response bubble (at least 2 total: user + assistant)
    await expect(this.messageBubbles).toHaveCount(2, { timeout: 30000 });
    // Wait for the textarea to be re-enabled (streaming done)
    await expect(this.composerInput).toBeEnabled({ timeout: 30000 });
  }
}
