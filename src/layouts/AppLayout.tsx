import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, LayoutDashboard, LogOut, Settings, Users, UtensilsCrossed } from 'lucide-react';
import type { PageKey } from '../types/api';
import { PAGE_DEFINITIONS, ROLE_LABELS } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

const PAGE_ICONS: Record<PageKey, typeof LayoutDashboard> = {
  home: LayoutDashboard,
  reports: BarChart3,
  users: Users,
  settings: Settings,
};

/**
 * Minimal Phase 1 shell: dark sidebar + top bar with the current user and logout.
 * Dashboard cards and the full navigation are Phase 2 work.
 */
export function AppLayout() {
  const { user, permissions, logout } = useAuth();
  const navigate = useNavigate();

  const visiblePages = PAGE_DEFINITIONS.filter((page) => permissions.includes(page.key));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-[240px] shrink-0 flex-col bg-sidebar p-4 text-white">
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary">
            <UtensilsCrossed aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-card-title">Gul Khan</p>
            <p className="text-caption text-white/60">Fast Food</p>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1">
          {visiblePages.map((page) => {
            const Icon = PAGE_ICONS[page.key];
            return (
              <NavLink
                key={page.key}
                to={page.path}
                className={({ isActive }) =>
                  cn(
                    'flex h-control items-center gap-3 rounded-control px-3 text-button transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon aria-hidden className="h-5 w-5" />
                {page.label}
              </NavLink>
            );
          })}
        </nav>

        <p className="px-1 text-caption text-white/40">Phase 1 · Login</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
          <div className="min-w-0">
            <p className="truncate font-heading text-card-title text-text-primary">
              Gul Khan Fast Food
            </p>
            <p className="text-caption text-text-secondary">Works offline</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-body font-medium text-text-primary">
                {user?.fullName || user?.username}
              </p>
              <p className="text-caption text-text-secondary">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-control items-center gap-2 rounded-control border border-border px-3 text-button text-text-primary hover:bg-background"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
