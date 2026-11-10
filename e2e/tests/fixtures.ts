import { test as base, expect, type Page } from '@playwright/test';

/**
 * Astro renders React islands on the server and hydrates them later in the browser.
 * Until an island is hydrated, typing into it doesn't reach React state (e.g. the
 * Sommelier button stays disabled). Islands keep the `ssr` attribute until hydrated.
 */
export async function waitForHydration(page: Page) {
  try {
    await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0, null, {
      timeout: 20_000,
    });
  } catch (e) {
    // The page navigated away (e.g. a guest redirected to /login): nothing left to wait for here.
    if (!/context was destroyed|Target page|navigation/i.test(String(e))) throw e;
  }
}

/** Same `page` fixture, but every `page.goto()` also waits for the islands to hydrate. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await waitForHydration(page);
      return response;
    };
    await use(page);
  },
});

export { expect };
