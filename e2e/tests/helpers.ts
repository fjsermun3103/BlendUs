import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = process.env.API_URL ?? 'http://localhost:8000/api';

export type Auth = {
  token: string;
  user: { id: number; name: string; username: string; email?: string };
  email: string;
  password: string;
};

const headers = (token?: string) => ({
  Accept: 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const unique = (prefix = 'e2e') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Registers a brand-new user through the API, so tests never depend on seed IDs. */
export async function createUser(request: APIRequestContext): Promise<Auth> {
  const username = unique();
  const email = `${username}@example.com`;
  const password = 'password123';
  const res = await request.post(`${API}/auth/register`, {
    headers: headers(),
    data: { name: username, username, email, password, password_confirmation: password },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  return { token: body.token, user: body.user, email, password };
}

/** Logs the browser in the same way the app does: token + user in localStorage. */
export async function loginAs(page: Page, auth: Auth) {
  await page.context().addInitScript(([token, user]) => {
    localStorage.setItem('blendus_token', token);
    localStorage.setItem('blendus_user', user);
  }, [auth.token, JSON.stringify(auth.user)] as const);
}

export async function createPost(
  request: APIRequestContext,
  auth: Auth,
  overrides: Partial<{ title: string; description: string; tags: string[] }> = {},
) {
  const res = await request.post(`${API}/posts`, {
    headers: headers(auth.token),
    data: {
      title: overrides.title ?? unique('Smoothie'),
      description: overrides.description ?? `E2E caption ${unique()}`,
      preparation_steps: 'Blend everything until smooth.',
      ingredients: [
        { name: 'Mango', quantity: 150, unit: 'g' },
        { name: 'Milk', quantity: 200, unit: 'ml' },
      ],
      tags: overrides.tags ?? ['tropical'],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).data as { id: number; title: string; description: string; image_url: string | null };
}

export async function getPost(request: APIRequestContext, id: number, auth?: Auth) {
  const res = await request.get(`${API}/posts/${id}`, { headers: headers(auth?.token) });
  return { status: res.status(), data: res.ok() ? (await res.json()).data : null };
}

export async function apiPost(request: APIRequestContext, path: string, auth: Auth, data: unknown) {
  const res = await request.post(`${API}${path}`, { headers: headers(auth.token), data });
  expect(res.ok(), await res.text()).toBeTruthy();
  return res.json();
}

/** Collects failed API calls (status >= 400) made by the page. */
export function trackFailedApiCalls(page: Page) {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return failed;
}

/** A PostCard in a feed, located by its (unique) caption — cards don't render the title. */
export const postCard = (page: Page, caption: string) => page.locator('section.post', { hasText: caption });

/** 1x1 PNG for upload tests. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
