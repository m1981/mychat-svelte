import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ChatPage {
  constructor(readonly page: Page) {}

  get composerInput() { return this.page.getByTestId('message-input'); }
  get sendBtn() { return this.page.getByTestId('send-btn'); }
  get stopBtn() { return this.page.getByTestId('stop-btn'); }
  get chatTitle() { return this.page.getByTestId('chat-view-title'); }
  get messageBubbles() { return this.page.getByTestId('message-bubble'); }
  get codeBlocks() { return this.page.locator('.code-block'); }
  get copyBtns() { return this.page.locator('.copy-btn'); }

  async sendMessage(text: string) {
    await this.composerInput.fill(text);
    await this.sendBtn.click();
  }

  async waitForResponse(timeout = 60000, expectedCount = 2) {
    // Wait for user bubble to appear first
    await expect(this.messageBubbles.first()).toBeVisible({ timeout: 10000 });
    // Wait for the expected number of bubbles (user + assistant pairs)
    await expect(this.messageBubbles).toHaveCount(expectedCount, { timeout });
    // Wait for the textarea to be re-enabled (streaming done)
    await expect(this.composerInput).toBeEnabled({ timeout });
  }

  /** Simulate dropping a text file onto the composer textarea. */
  async dropTextFile(filename: string, content: string) {
    await this.page.evaluate(
      ({ filename, content }) => {
        const textarea = document.querySelector('[data-testid="message-input"]') as HTMLTextAreaElement;
        if (!textarea) throw new Error('message-input not found');
        const file = new File([content], filename, { type: 'text/plain' });
        const dt = new DataTransfer();
        dt.items.add(file);
        textarea.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
        textarea.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      },
      { filename, content }
    );
    // FileReader is async — give it a tick to complete
    await this.page.waitForTimeout(300);
  }
}
