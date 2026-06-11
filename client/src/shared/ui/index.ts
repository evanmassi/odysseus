/**
 * Shared UI
 *
 * Barrel export for shared UI primitives, boundaries, and loading components.
 */

// UI Primitive Components
export { InlineEditInput } from './components/inputs/InlineEditInput';
export { ValidatedInput } from './components/inputs/ValidatedInput';
export { ErrorBanner } from './primitives/banners/ErrorBanner';

// Re-export all primitives for convenience
export * from './primitives';

// Error boundaries
export { ErrorBoundary } from './components/boundaries/ErrorBoundary';
export { SuspenseBoundary } from './components/boundaries/SuspenseBoundary';

// Info display components
export { DetailRow, InfoField, InfoGroup } from './components/info-display';
export type { DetailRowProps, InfoFieldProps } from './components/info-display';
export type { InfoGroupProps } from './components/info-display';

// Loading components
export {
  LoadingOverlay,
  LoadingSkeleton,
  LoadingSpinner,
  ModalSkeleton,
} from './components/loading';
