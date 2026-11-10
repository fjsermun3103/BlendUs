import { test, expect } from './fixtures';
import { createUser, loginAs } from './helpers';

test.describe('UI quality', () => {
  test('pages do not request missing static assets', async ({ page, request }) => {
    await loginAs(page, await createUser(request));
    const missing: string[] = [];
    page.on('response', (r) => {
      if (r.url().startsWith('http://localhost:4321/') && r.status() === 404 && r.request().resourceType() !== 'document') {
        missing.push(r.url());
      }
    });

    for (const path of ['/', '/create', '/explore', '/marketplace', '/sommelier']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  test('unknown routes show the custom 404 page', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Return to the Kitchen')).toBeVisible();
  });
});

test.describe('Mobile @mobile', () => {
  for (const path of ['/', '/explore', '/marketplace', '/messages', '/create']) {
    test(`no horizontal scroll on ${path} @mobile`, async ({ page, request }) => {
      await loginAs(page, await createUser(request));
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `page is ${overflow}px wider than the viewport`).toBeLessThanOrEqual(1);
    });
  }
});
