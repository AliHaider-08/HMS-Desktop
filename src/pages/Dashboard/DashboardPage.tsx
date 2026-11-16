import { ArrowRight, CircleCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../types/user';

/**
 * Placeholder landing page so login can be tested end to end.
 * Real dashboard cards are Phase 2 (docs/phases.md).
 */
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-page-title">Welcome, {user?.fullName || user?.username}</h1>
      <p className="mb-6 mt-1 text-body text-text-secondary">
        You are signed in as {user ? ROLE_LABELS[user.role] : 'user'}. Phase 1 is complete.
      </p>

      <div className="card p-6">
        <h2 className="mb-3 text-section-title">Phase 1 checklist</h2>
        <ul className="flex flex-col gap-2 text-body text-text-primary">
          {[
            'Database created with users and settings tables',
            'Default admin created on first run',
            'Login checked through IPC with bcrypt',
            'Roles enforced in the main process',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 text-status-success" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-center gap-2 text-caption text-text-secondary">
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          Dashboard cards, sidebar navigation and settings arrive in Phase 2.
        </p>
      </div>
    </div>
  );
}
