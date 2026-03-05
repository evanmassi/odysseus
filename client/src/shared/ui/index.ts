/**
 * Shared UI Components Public API
 *
 * Clean architecture - only contains generic UI primitives and components
 * that are truly shared and domain-agnostic.
 */

// Connection Status (shared component)
export { ConnectionIndicator } from './layout/ConnectionIndicator';

// UI Primitive Components
export { InlineEditInput } from './components/inputs/InlineEditInput';
export { ValidatedInput } from './components/inputs/ValidatedInput';
export { ContextMenu } from './primitives/ContextMenu';
export { ErrorBanner } from './primitives/ErrorBanner';

// Re-export all primitives for convenience
export * from './primitives';

// Error boundaries
export { ErrorBoundary } from './components/boundaries/ErrorBoundary';
export { SuspenseBoundary } from './components/boundaries/SuspenseBoundary';

// Animation
export { AnimatedPresence, useAnimatedPresence } from './components/AnimatedPresence';

// Loading components
export { LoadingOverlay, LoadingSkeletons, Spinner } from './components/loading';
export { TabSkeleton } from './components/TabSkeleton';

// Connection status
export { ConnectionStatusIndicator } from './components/ConnectionStatusIndicator';
