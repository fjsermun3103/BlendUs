import { test, expect } from './fixtures';
import { API, createUser, loginAs } from './helpers';

/**
 * AI responses are mocked with page.route so these tests check *our* UI
 * deterministically. Set OLLAMA_E2E=1 to also run the smoke test against the real model.
 */
test.describe('AI features', () => {
  test('sommelier shows the explanation and the recommended smoothies', async ({ page, request }) => {
    const posts = (await (await request.get(`${API}/posts?per_page=2`)).json()).data;
    await page.route('**/api/ai/sommelier', (route) =>
      route.fulfill({ json: { explanation: 'Perfect for **recovery**!', posts } }),
    );
    await loginAs(page, await createUser(request));

    await page.goto('/sommelier');
    await page.getByPlaceholder(/heavy workout/).fill('I just ran 10k');
    await page.getByRole('button', { name: 'Match Smoothies' }).click();

    await expect(page.getByText('Here is what I recommend for you:')).toBeVisible();
    await expect(page.locator('.sommelier-explanation strong, .sommelier-explanation b')).toHaveText('recovery');
    await expect(page.locator('.sommelier-posts-grid section.post')).toHaveCount(posts.length);
  });

  test('sommelier shows the error returned by the API', async ({ page, request }) => {
    await page.route('**/api/ai/sommelier', (route) =>
      route.fulfill({ status: 503, json: { error: 'Could not connect to AI service.' } }),
    );
    await loginAs(page, await createUser(request));

    await page.goto('/sommelier');
    await page.getByPlaceholder(/heavy workout/).fill('tired');
    await page.getByRole('button', { name: 'Match Smoothies' }).click();

    await expect(page.locator('.sommelier-error')).toHaveText('Could not connect to AI service.');
  });

  test('"Create with AI" fills in the recipe form', async ({ page, request }) => {
    await page.route('**/api/ai/generate-smoothie', (route) =>
      route.fulfill({
        json: {
          name: 'Golden Hour',
          description: 'Mango and turmeric.',
          ingredients: [{ name: 'Mango', amount: '200 g' }, { name: 'Turmeric', amount: '1 tsp' }],
          tags: ['sunny'],
          category: 'tropical',
          preparation_steps: ['Peel the mango.', 'Blend.'],
        },
      }),
    );
    await loginAs(page, await createUser(request));

    await page.goto('/create');
    await page.getByText('Create with AI').click();
    await page.getByPlaceholder(/refreshing tropical smoothie/).fill('mango and turmeric');
    await page.getByRole('button', { name: /Generate Smoothie/ }).click();

    await expect(page.locator('#name')).toHaveValue('Golden Hour');
    await expect(page.locator('#category')).toHaveValue('tropical');
    await expect(page.getByPlaceholder('Ingredient')).toHaveCount(2);
    await expect(page.locator('#instructions')).toHaveValue('Peel the mango.\n\nBlend.');
  });

  test('sommelier works end to end with the real model @ollama', async ({ page, request }) => {
    test.skip(!process.env.OLLAMA_E2E, 'Set OLLAMA_E2E=1 to run against the real Ollama model');
    test.setTimeout(120_000);
    await loginAs(page, await createUser(request));

    await page.goto('/sommelier');
    await page.getByPlaceholder(/heavy workout/).fill('something with mango after the gym');
    await page.getByRole('button', { name: 'Match Smoothies' }).click();

    await expect(page.getByText('Here is what I recommend for you:')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('.sommelier-posts-grid section.post').first()).toBeVisible();
  });
});

test.describe('Marketplace', () => {
  test('products are listed and their detail page opens', async ({ page }) => {
    await page.goto('/marketplace');
    const firstCard = page.locator('.products-grid > .grid').first();
    const firstName = (await firstCard.locator('h3').innerText()).trim();
    await expect(page.locator('.products-grid').getByText(/€\d+[.,]\d{2}/).first()).toBeVisible();

    // The whole card is covered by an invisible link (z-index 5): click that, like a user would
    await firstCard.locator('a').first().click();
    await expect(page).toHaveURL(/\/marketplace\/product\/\d+$/);
    await expect(page.getByText(firstName).first()).toBeVisible();
    await expect(page.getByText('Back to Marketplace')).toBeVisible();
  });
});
