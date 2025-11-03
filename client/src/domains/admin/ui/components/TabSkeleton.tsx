/**
 * Admin Settings Tab Loading Skeleton
 *
 * Displays animated placeholder content while lazy-loaded tab components
 * are being fetched and rendered. Provides visual feedback to users and
 * reduces perceived latency during tab switches.
 *
 * @module admin/ui/components
 */

/**
 * TabSkeleton Component
 *
 * Renders an accessible, animated loading skeleton that mimics the structure
 * of admin settings tabs. Displayed during:
 * - Initial tab load (first time user switches to a tab)
 * - Network delays in lazy chunk loading
 * - React Suspense fallback state
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Screen reader announces "Loading settings..."
 * - role="status" for live region updates
 *
 * @returns {JSX.Element} Animated skeleton placeholder
 *
 * @example
 * ```tsx
 * <Suspense fallback={<TabSkeleton />}>
 *   <SecurityTab {...props} />
 * </Suspense>
 * ```
 */
export function TabSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-label="Loading settings..."
      aria-live="polite"
    >
      {/* Header skeleton - represents tab title */}
      <div className="h-8 bg-gray-200 rounded w-1/3" aria-hidden="true"></div>

      {/* Content skeletons - represent form fields/sections */}
      <div className="space-y-4" aria-hidden="true">
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
      </div>

      {/* Screen reader only text */}
      <span className="sr-only">Loading admin settings content, please wait...</span>
    </div>
  );
}
