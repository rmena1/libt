import { Page, BrowserContext } from '@playwright/test';

// Test session token (created in test setup)
export const TEST_SESSION = 'ecp2nl7ir93pm7sp9totg';

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
