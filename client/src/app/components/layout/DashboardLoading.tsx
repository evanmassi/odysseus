/**
 * Dashboard Loading
 *
 * Centered branded spinner for dashboard lazy-load and storage-sync states.
 */

import { LoadingSpinner } from '@shared/ui';

export function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" className="text-primary" />
    </div>
  );
}
