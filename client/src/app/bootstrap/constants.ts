/**
 * Bootstrap Step Definitions
 *
 * Ordered initialization sequence with display labels used across the loading UI.
 */
import type { BootstrapStepInfo } from './types';

export const BOOTSTRAP_STEPS: readonly BootstrapStepInfo[] = [
  {
    step: 'initialization',
    label: 'Initializing Application',
    completed: false,
  },
  {
    step: 'auth-check',
    label: 'Checking Authentication',
    completed: false,
  },
  {
    step: 'session-restore',
    label: 'Restoring Session',
    completed: false,
  },
  {
    step: 'cache-validation',
    label: 'Validating Cache',
    completed: false,
  },
  {
    step: 'socket-connection',
    label: 'Connecting to Server',
    completed: false,
  },
  {
    step: 'data-loading',
    label: 'Loading Data',
    completed: false,
  },
  {
    step: 'complete',
    label: 'Ready',
    completed: false,
  },
];
