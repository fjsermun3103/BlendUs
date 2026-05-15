const DEFAULT_AVATARS = [
  '/assets/avatars/strawberry.webp',
  '/assets/avatars/mango.webp',
  '/assets/avatars/blueberry.webp',
  '/assets/avatars/kiwi.webp'
];

/**
 * Returns a stable default avatar based on the user ID.
 * If no ID is provided, it returns the first one.
 */
export function getDefaultAvatar(userId: number | undefined): string {
  if (!userId) return DEFAULT_AVATARS[0];
  const index = userId % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

/**
 * Returns formatted initials for a given name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
