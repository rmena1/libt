import { Page, BrowserContext } from '@playwright/test';

// Test session token — uses clod3@test.com account (NOT Rai's personal account)
export const TEST_SESSION = 'bzhnmyefkdwk54pzkvlwu';

/**
 * Set authentication cookie for tests
 */
export async function authenticate(context: BrowserContext) {
  await context.addCookies([{
    name: 'libt_session',
    value: TEST_SESSION,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
}
