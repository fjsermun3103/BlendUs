import { test, expect } from './fixtures';
import { API, PNG, createPost, createUser, getPost, loginAs, postCard, unique } from './helpers';

test.describe('Creating, editing and deleting posts', () => {
  test('a user can publish a smoothie with photo, ingredients and tags', async ({ page, request }) => {
    const auth = await createUser(request);
    await loginAs(page, auth);
    const title = unique('Sunrise');
    const caption = `Fresh morning blend ${unique()}`;

    await page.goto('/create');
    await page.locator('input[type=file]').setInputFiles({ name: 'smoothie.png', mimeType: 'image/png', buffer: PNG });
    await page.locator('#name').fill(title);
    await page.locator('#category').selectOption('tropical');
    await page.locator('#caption').fill(caption);
    await page.getByPlaceholder('Ingredient').first().fill('Mango');
    await page.getByPlaceholder('Amount (e.g. 200 g)').first().fill('200 g');
    await page.getByPlaceholder('Type a new tag...').fill('summer');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.locator('#instructions').fill('Blend until smooth.');
    await page.getByRole('button', { name: /Share Smoothie/ }).click();

    await expect(page.getByText('Smoothie Shared!')).toBeVisible();
    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(postCard(page, caption)).toBeVisible();

    const mine = await (await request.get(`${API}/posts?user_id=${auth.user.id}`)).json();
    const created = mine.data[0];
    expect(created.title).toBe(title);
    expect(created.image_url).toContain('/storage/posts/');
    expect(created.ingredients).toEqual([{ name: 'Mango', quantity: '200.00', unit: 'g' }]);
    expect(created.tags.map((t: { name: string }) => t.name).sort()).toEqual(['summer', 'tropical']);
  });

  test('create form shows a validation message when fields are missing', async ({ page, request }) => {
    await loginAs(page, await createUser(request));
    await page.goto('/create');
    await page.getByRole('button', { name: /Share Smoothie/ }).click();
    await expect(page.getByText('Please fill in the name, caption and instructions.')).toBeVisible();
  });

  test('post detail shows ingredients and accepts comments', async ({ page, request }) => {
    const author = await createUser(request);
    const post = await createPost(request, author);
    await loginAs(page, await createUser(request));
    const text = `Love it ${unique()}`;

    await page.goto(`/post/${post.id}`);
    await expect(page.getByText(post.title)).toBeVisible();
    await expect(page.getByText('Mango')).toBeVisible();
    await page.getByPlaceholder('Add a comment').fill(text);
    await page.getByPlaceholder('Add a comment').press('Enter');
    await expect(page.getByText(text)).toBeVisible();
  });

  test('the author can edit the title of their post', async ({ page, request }) => {
    const auth = await createUser(request);
    const post = await createPost(request, auth);
    await loginAs(page, auth);
    const newTitle = unique('Edited');

    await page.goto(`/edit/${post.id}`);
    await expect(page.locator('#name')).toHaveValue(post.title);
    await page.locator('#name').fill(newTitle);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(async () => (await getPost(request, post.id)).data.title).toBe(newTitle);
  });

  test('the author can change the photo of their post', async ({ page, request }) => {
    const auth = await createUser(request);
    const post = await createPost(request, auth);
    await loginAs(page, auth);

    await page.goto(`/edit/${post.id}`);
    await expect(page.locator('#name')).toHaveValue(post.title);
    await page.locator('input[type=file]').setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect
      .poll(async () => (await getPost(request, post.id)).data.image_url, { message: 'new photo should be saved' })
      .toContain('/storage/posts/');
  });

  test("a user cannot open the edit form for someone else's post", async ({ page, request }) => {
    const post = await createPost(request, await createUser(request));
    await loginAs(page, await createUser(request));

    await page.goto(`/edit/${post.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
  });

  test('the author can delete their post from the feed', async ({ page, request }) => {
    const auth = await createUser(request);
    const post = await createPost(request, auth);
    await loginAs(page, auth);
    page.on('dialog', (d) => d.accept());

    await page.goto('/');
    const card = postCard(page, post.description);
    await card.locator('.post-options').click();
    await card.getByRole('button', { name: 'Delete Post' }).click();

    await expect(postCard(page, post.description)).toHaveCount(0);
    expect((await getPost(request, post.id)).status).toBe(404);
  });
});
