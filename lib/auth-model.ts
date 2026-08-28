export type AppRole = 'ADMIN' | 'USER';

export function safeNextPath(value: string | null | undefined, fallback = '/workflow') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function hasRole(actual: AppRole | null | undefined, required: AppRole) {
  return actual === required;
}

export function canManageUser(actorId: string, targetId: string, actorRole: AppRole, actorActive: boolean, nextRole: AppRole, nextActive: boolean) {
  if (actorRole !== 'ADMIN' || !actorActive) return false;
  if (actorId === targetId && (nextRole !== 'ADMIN' || !nextActive)) return false;
  return true;
}
