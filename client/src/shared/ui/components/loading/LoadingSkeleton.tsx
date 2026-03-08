/**
 * Tab Loading Skeleton
 *
 * Suspense fallback for lazy-loaded tab content in modals.
 */
export function LoadingSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-label="Loading settings..."
      aria-live="polite"
    >
      <div className="h-8 bg-border rounded w-1/3" aria-hidden="true"></div>

      <div className="space-y-4" aria-hidden="true">
        <div className="h-16 bg-muted rounded"></div>
        <div className="h-16 bg-muted rounded"></div>
        <div className="h-16 bg-muted rounded"></div>
      </div>

      <span className="sr-only">Loading admin settings content, please wait...</span>
    </div>
  );
}
