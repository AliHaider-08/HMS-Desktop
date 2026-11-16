import type { PageKey, UserRole } from './api';

export interface RoleLabels {
  admin: string;
  cashier: string;
  manager: string;
}

export const ROLE_LABELS: RoleLabels = {
  admin: 'Admin',
  cashier: 'Cashier',
  manager: 'Manager',
};

/** Every page that will exist after Phase 2, in sidebar order. */
export interface PageDefinition {
  key: PageKey;
  label: string;
  description: string;
  path: string;
}

export const PAGE_DEFINITIONS: PageDefinition[] = [
  {
    key: 'home',
    label: 'Dashboard',
    description: "Today's sales, orders and quick actions arrive in Phase 2.",
    path: '/dashboard',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Daily and monthly sales reports are built in Phase 6.',
    path: '/reports',
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Creating and disabling cashier or manager accounts is an admin task.',
    path: '/users',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Shop name, tax and printer settings are built in Phase 2.',
    path: '/settings',
  },
];

export const ROLE_ORDER: UserRole[] = ['admin', 'manager', 'cashier'];
