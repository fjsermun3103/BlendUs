import { test, expect } from './fixtures';
import { API, createPost, createUser, getPost, loginAs, postCard, trackFailedApiCalls, unique } from './helpers';

test.describe('Feed', () => {
  test('guests can browse the feed without API errors', async ({ page }) => {
    const failed = trackFailedApiCalls(page);
    await page.goto('/');

    await expect(page.locator('section.post').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(failed, 'API calls that failed for a guest on the home page').toEqual([]);
  });

  test('a newly published post appears first in "Latest"', async ({ page, request }) => {
    const author = await createUser(request);
    const post = await createPost(request, author);

    await page.goto('/');
    await expect(page.locator('section.post').first()).toContainText(post.description);
  });

  test('category filter shows only posts with that tag', async ({ page, request }) => {
    const author = await createUser(request);
    const caption = `Berry only ${unique()}`;
    await createPost(request, author, { description: caption, tags: ['berry'] });

    await page.goto('/');
    await page.locator('.filters .filter', { hasText: /^berry$/ }).click();

    await expect(postCard(page, caption)).toBeVisible();
    const cards = page.locator('section.post');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).locator('.hashtags')).toContainText('#berry');
    }
  });

  test('guest clicking like is sent to login', async ({ page }) => {
    await page.goto('/');
    await page.locator('section.post').first().locator('.like-comment-share > div').first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('a logged-in user can like a post and it persists', async ({ page, request }) => {
    const author = await createUser(request);
    const reader = await createUser(request);
    const post = await createPost(request, author);
    await loginAs(page, reader);

    await page.goto('/');
    const likeButton = postCard(page, post.description).locator('.like-comment-share > div').first();
    await expect(likeButton).toHaveText('0');
    await likeButton.click();
    await expect(likeButton).toHaveText('1');

    const { data } = await getPost(request, post.id, reader);
    expect(data.has_liked).toBe(true);
    expect(data.likes_count).toBe(1);
  });

  test('a logged-in user can comment from the feed', async ({ page, request }) => {
    const author = await createUser(request);
    const reader = await createUser(request);
    const post = await createPost(request, author);
    await loginAs(page, reader);
    const text = `Nice one ${unique()}`;

    await page.goto('/');
    const card = postCard(page, post.description);
    await card.locator('.like-comment-share > div').nth(1).click();
    await card.getByPlaceholder('Add a comment...').fill(text);
    await card.getByRole('button', { name: 'Post' }).click();

    await expect(card.getByText(text)).toBeVisible();
    const comments = await (await request.get(`${API}/posts/${post.id}/comments`)).json();
    expect(comments.data.map((c: { body: string }) => c.body)).toContain(text);
  });

  test('a logged-in user can save a post and see it in their profile', async ({ page, request }) => {
    const author = await createUser(request);
    const reader = await createUser(request);
    const post = await createPost(request, author);
    await loginAs(page, reader);

    await page.goto('/');
    await postCard(page, post.description).locator('.save').click();
    await expect(postCard(page, post.description).locator('.save-icon')).toHaveClass(/active/);

    await page.goto(`/profile/${reader.user.id}`);
    await page.getByText('Saved', { exact: true }).click();
    await expect(page.getByText(post.title)).toBeVisible();
  });

  test('explore search finds a post by title', async ({ page, request }) => {
    const title = unique('Kiwi');
    await createPost(request, await createUser(request), { title });

    await page.goto('/explore');
    await page.getByPlaceholder('Search smoothies, tags, categories...').fill(title);
    await expect(page.getByText(title)).toBeVisible();
  });
});
