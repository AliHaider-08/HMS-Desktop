import type { PageKey, RolePermissions, UserRole } from '../../src/types/api';

/**
 * The single source of truth for what each role may open.
 * Lives in the main process on purpose: the renderer asks for it over IPC and
 * never decides permissions on its own (see Rules.md section 7 / architecture.md).
 */
const ROLE_PAGES: Record<UserRole, PageKey[]> = {
  admin: ['home', 'users', 'settings', 'reports'],
  cashier: ['home'],
  manager: ['home', 'reports'],
};

export function getRolePermissions(role: UserRole): RolePermissions {
  return { role, pages: [...ROLE_PAGES[role]] };
}

export function roleHasPage(role: UserRole, page: PageKey): boolean {
  return ROLE_PAGES[role].includes(page);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  cashier: 'Cashier',
  manager: 'Manager',
};
