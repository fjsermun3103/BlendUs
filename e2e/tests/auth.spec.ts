import { test, expect } from './fixtures';
import { createPost, createUser, loginAs, unique } from './helpers';

test.describe('Authentication', () => {
  test('a visitor can register and lands logged in on the home page', async ({ page }) => {
    const username = unique();
    await page.goto('/register');

    await page.locator('#username').fill(username);
    await page.locator('#email').fill(`${username}@example.com`);
    await page.locator('#password').fill('password123');
    await page.locator('#password_confirmation').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText(username).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('blendus_token'))).toBeTruthy();
  });

  test('register shows an error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.locator('#username').fill(unique());
    await page.locator('#email').fill(`${unique()}@example.com`);
    await page.locator('#password').fill('password123');
    await page.locator('#password_confirmation').fill('password124');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('a user can log in with email', async ({ page, request }) => {
    const auth = await createUser(request);
    await page.goto('/login');

    await page.getByPlaceholder('Username or email').fill(auth.email);
    await page.getByPlaceholder('Password').fill(auth.password);
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL('/');
    expect(await page.evaluate(() => localStorage.getItem('blendus_token'))).toBeTruthy();
  });

  test('a user can log in with username, as the login field promises', async ({ page, request }) => {
    const auth = await createUser(request);
    await page.goto('/login');

    await page.getByPlaceholder('Username or email').fill(auth.user.username);
    await page.getByPlaceholder('Password').fill(auth.password);
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL('/');
  });

  test('wrong password shows an error and stays on login', async ({ page, request }) => {
    const auth = await createUser(request);
    await page.goto('/login');

    await page.getByPlaceholder('Username or email').fill(auth.email);
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.locator('.form-error-inline')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('a user can log out from their profile', async ({ page, request }) => {
    const auth = await createUser(request);
    await loginAs(page, auth);
    await page.goto(`/profile/${auth.user.id}`);

    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/login/);
    const tokenRes = await request.get('http://localhost:8000/api/conversations', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` },
    });
    expect(tokenRes.status(), 'token should be revoked on logout').toBe(401);
  });

  test.describe('protected pages redirect guests to login', () => {
    for (const path of ['/create', '/messages']) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login/);
      });
    }

    test('/edit/:id', async ({ page, request }) => {
      const post = await createPost(request, await createUser(request));
      await page.goto(`/edit/${post.id}`);
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
