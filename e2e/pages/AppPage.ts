import type { Page, APIRequestContext } from '@playwright/test';

export class AppPage {
  constructor(readonly page: Page, readonly request: APIRequestContext) {}

  private get authHeaders() {
    return { 'x-test-auth-token': 'vitest-test-bypass-token' };
  }

  async goto(path = '/') {
    // Set auth cookie/header for page navigation
    await this.page.setExtraHTTPHeaders(this.authHeaders);
    await this.page.goto(path);
  }

  // Full page reload that re-applies auth headers to the new page context.
  // page.reload() alone may not carry setExtraHTTPHeaders through to JS-initiated
  // fetch calls in the reloaded page; re-applying after reload ensures all
  // subsequent fetch calls (e.g. loadChatKnowledge) include the test bypass token.
  async reload() {
    await this.page.reload();
    await this.page.setExtraHTTPHeaders(this.authHeaders);
  }

  async createChatViaApi(): Promise<string> {
    const res = await this.request.post('/api/chats', {
      data: {},
      headers: this.authHeaders
    });
    const chat = await res.json();
    return chat.id;
  }

  async createFolderViaApi(name = 'Test Folder'): Promise<string> {
    const res = await this.request.post('/api/folders', {
      data: { name, order: 0 },
      headers: this.authHeaders
    });
    const folder = await res.json();
    return folder.id;
  }

  async deleteChatViaApi(id: string) {
    await this.request.delete(`/api/chats/${id}`, {
      headers: this.authHeaders
    });
  }

  async deleteFolderViaApi(id: string) {
    await this.request.delete(`/api/folders/${id}`, {
      headers: this.authHeaders
    });
  }

  async getChatViaApi(id: string) {
    const res = await this.request.get(`/api/chats/${id}`, {
      headers: this.authHeaders
    });
    return res.json();
  }

  // Raw authenticated GET — returns the full response so callers can check status
  async apiGet(path: string) {
    return this.request.get(path, { headers: this.authHeaders });
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }
}
