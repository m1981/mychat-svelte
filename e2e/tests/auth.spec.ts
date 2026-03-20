/**
 * E2E tests for Auth.js Google OAuth integration.
 * Full OAuth flow cannot be automated without test credentials,
 * so we test the redirect behaviour and sign-in page.
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('@smoke unauthenticated visit to / redirects to sign-in', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
  });

  test('@smoke sign-in page shows Google button', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/signin');
    await expect(page.getByText(/Google/i)).toBeVisible({ timeout: 10000 });
  });

  test('@smoke direct chat URL redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:5173/chat/some-chat-id');
    await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
  });
});
