/**
 * Shared UI Components Public API
 *
 * Clean architecture - only contains generic UI primitives and components
 * that are truly shared and domain-agnostic.
 */

// Connection Status (shared component)
export { ConnectionIndicator } from './layout/ConnectionIndicator';

// UI Primitive Components
export { InlineEditInput } from './primitives/inputs/InlineEditInput';
export { ValidatedInput } from './primitives/inputs/ValidatedInput';
export { ContextMenu } from './primitives/shared/ContextMenu';
export { ErrorBanner } from './primitives/shared/ErrorBanner';

// Re-export all primitives for convenience
export * from './primitives';

// Error boundaries
export { ErrorBoundary } from './components/boundaries/ErrorBoundary';
export { SuspenseBoundary } from './components/boundaries/SuspenseBoundary';

// Animation
export { AnimatedPresence, useAnimatedPresence } from './components/AnimatedPresence';

// Loading components
export { LoadingOverlay, LoadingSkeletons, Spinner } from './components/loading';

// Connection status
export { ConnectionStatusIndicator } from './components/ConnectionStatusIndicator';
