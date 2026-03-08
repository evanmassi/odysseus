/**
 * Shared UI Components Public API
 *
 * Clean architecture - only contains generic UI primitives and components
 * that are truly shared and domain-agnostic.
 */

// UI Primitive Components
export { InlineEditInput } from './components/inputs/InlineEditInput';
export { ValidatedInput } from './components/inputs/ValidatedInput';
export { ContextMenu } from './primitives/menus/ContextMenu';
export { ErrorBanner } from './primitives/banners/ErrorBanner';

// Re-export all primitives for convenience
export * from './primitives';

// Error boundaries
export { ErrorBoundary } from './components/boundaries/ErrorBoundary';
export { SuspenseBoundary } from './components/boundaries/SuspenseBoundary';

// Loading components
export {
  LoadingOverlay,
  LoadingSkeleton,
  LoadingSpinner,
  ModalSkeleton,
} from './components/loading';
