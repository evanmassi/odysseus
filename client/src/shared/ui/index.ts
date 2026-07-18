/**
 * Shared UI
 *
 * Barrel export for shared UI primitives, boundaries, and loading components.
 */

// UI Primitive Components
export { ValidatedInput } from './components/inputs/ValidatedInput';

// Re-export all primitives for convenience
export * from './primitives';

// Error boundaries
export { ErrorBoundary } from './components/boundaries/ErrorBoundary';
export { LazyModalBoundary } from './components/boundaries/LazyModalBoundary';
export { SuspenseBoundary } from './components/boundaries/SuspenseBoundary';

// Info display components
export {
  AccentTick,
  CompletenessMeter,
  DetailRow,
  InfoPanelEmpty,
  OccupancyBar,
  StripLabel,
} from './components/info-display';
export type { AccentTickTone } from './components/info-display';

// Loading components
export { LoadingSkeleton, LoadingSpinner } from './components/loading';
