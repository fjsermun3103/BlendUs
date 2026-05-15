import { atom, computed } from 'nanostores';
import type { User } from '../lib/api';

// Auth token atom
export const $token = atom<string | null>(null);

// Current user atom
export const $user = atom<User | null>(null);

// Derived: is user logged in?
export const $isLoggedIn = computed($token, (token) => token !== null);

// Initialize from localStorage on client
export function initAuth() {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('blendus_token');
    const userStr = localStorage.getItem('blendus_user');
    if (token) $token.set(token);
    if (userStr) {
        try { $user.set(JSON.parse(userStr)); } catch { }
    }
}

export function setAuth(token: string, user: User) {
    localStorage.setItem('blendus_token', token);
    localStorage.setItem('blendus_user', JSON.stringify(user));
    $token.set(token);
    $user.set(user);
}

export function clearAuth() {
    localStorage.removeItem('blendus_token');
    localStorage.removeItem('blendus_user');
    $token.set(null);
    $user.set(null);
}
