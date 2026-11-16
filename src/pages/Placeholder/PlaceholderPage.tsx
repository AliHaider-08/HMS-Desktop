import { Construction } from 'lucide-react';
import type { PageKey } from '../../types/api';
import { PAGE_DEFINITIONS } from '../../types/user';

interface PlaceholderPageProps {
  page: PageKey;
}

/**
 * Role-protected route that exists but is built in a later phase.
 * Keeping it here lets Phase 1 prove that role guards work.
 */
export function PlaceholderPage({ page }: PlaceholderPageProps) {
  const definition = PAGE_DEFINITIONS.find((entry) => entry.key === page);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-page-title">{definition?.label ?? 'Page'}</h1>
      <div className="card mt-4 flex items-start gap-3 p-6">
        <Construction aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
        <div>
          <h2 className="text-card-title">Coming in a later phase</h2>
          <p className="mt-1 text-body text-text-secondary">
            {definition?.description ?? 'This page is not built yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
