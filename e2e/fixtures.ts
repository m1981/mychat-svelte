import { test as base, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';
import { SidebarPage } from './pages/SidebarPage';
import { ChatPage } from './pages/ChatPage';
import * as fs from 'fs';

// Ensure screenshots dir exists
if (!fs.existsSync('e2e/screenshots')) fs.mkdirSync('e2e/screenshots', { recursive: true });

type Fixtures = {
  app: AppPage;
  sidebar: SidebarPage;
  chat: ChatPage;
};

export const test = base.extend<Fixtures>({
  app: async ({ page, request }, use) => {
    await use(new AppPage(page, request));
  },
  sidebar: async ({ page }, use) => {
    await use(new SidebarPage(page));
  },
  chat: async ({ page }, use) => {
    await use(new ChatPage(page));
  }
});

export { expect };
