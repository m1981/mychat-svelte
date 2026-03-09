import type { Page, APIRequestContext } from '@playwright/test';

export class AppPage {
  constructor(readonly page: Page, readonly request: APIRequestContext) {}

  async goto(path = '/') { await this.page.goto(path); }

  async createChatViaApi(): Promise<string> {
    const res = await this.request.post('/api/chats', { data: {} });
    const chat = await res.json();
    return chat.id;
  }

  async createFolderViaApi(name = 'Test Folder'): Promise<string> {
    const res = await this.request.post('/api/folders', { data: { name, order: 0 } });
    const folder = await res.json();
    return folder.id;
  }

  async deleteChatViaApi(id: string) {
    await this.request.delete(`/api/chats/${id}`);
  }

  async deleteFolderViaApi(id: string) {
    await this.request.delete(`/api/folders/${id}`);
  }

  async getChatViaApi(id: string) {
    const res = await this.request.get(`/api/chats/${id}`);
    return res.json();
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }
}
