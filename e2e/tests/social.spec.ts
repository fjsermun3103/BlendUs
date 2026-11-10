import { test, expect } from './fixtures';
import { API, apiPost, createUser, loginAs, unique } from './helpers';

test.describe('Profiles and messaging', () => {
  test('a user can follow and unfollow another user', async ({ page, request }) => {
    const target = await createUser(request);
    await loginAs(page, await createUser(request));

    await page.goto(`/profile/${target.user.id}`);
    const followers = page.locator('.stat', { hasText: 'followers' }).locator('.stat-number');
    await expect(followers).toHaveText('0');

    await page.getByRole('button', { name: 'Follow' }).click();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await expect(followers).toHaveText('1');

    await page.getByRole('button', { name: 'Following' }).click();
    await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
    await expect(followers).toHaveText('0');
  });

  test('a user can edit their profile bio', async ({ page, request }) => {
    const auth = await createUser(request);
    await loginAs(page, auth);
    const bio = `Smoothie fan ${unique()}`;

    await page.goto(`/profile/${auth.user.id}`);
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByPlaceholder('Tell the community about yourself...').fill(bio);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText(bio)).toBeVisible();
    const user = await (await request.get(`${API}/users/${auth.user.id}`)).json();
    expect(user.data.bio).toBe(bio);
  });

  test('a user can clear their bio', async ({ page, request }) => {
    const auth = await createUser(request);
    const seeded = await request.put(`${API}/users/${auth.user.id}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` },
      data: { bio: 'To be removed' },
    });
    expect(seeded.ok()).toBeTruthy();
    await loginAs(page, auth);

    await page.goto(`/profile/${auth.user.id}`);
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await page.getByPlaceholder('Tell the community about yourself...').fill('');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect
      .poll(async () => (await (await request.get(`${API}/users/${auth.user.id}`)).json()).data.bio)
      .toBeFalsy();
  });

  test('two users can exchange direct messages', async ({ page, request }) => {
    const me = await createUser(request);
    const friend = await createUser(request);
    const conversation = (await apiPost(request, '/conversations', me, { type: 'dm', user_id: friend.user.id })).data;
    await loginAs(page, me);
    const text = `Hola ${unique()}`;

    await page.goto('/messages');
    await page.getByText(friend.user.name).first().click();
    await page.getByPlaceholder('Write a message...').fill(text);
    await page.getByPlaceholder('Write a message...').press('Enter');

    await expect(page.locator('.msg-bubble', { hasText: text })).toBeVisible();
    const msgs = await (
      await request.get(`${API}/conversations/${conversation.id}/messages`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${friend.token}` },
      })
    ).json();
    expect(msgs.data.map((m: { body: string }) => m.body)).toContain(text);
  });
});
