/**
 * Application bootstrap constants
 */
import type { BootstrapStepInfo } from './types';

export const BOOTSTRAP_STEPS: BootstrapStepInfo[] = [
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

export const BOOTSTRAP_TIMEOUT = 30000; // 30 seconds

/**
 * Loading messages for each bootstrap step
 */
export const LOADING_MESSAGES = {
  initialization: 'Initializing Application',
  'auth-check': 'Checking Authentication',
  'session-restore': 'Restoring Session',
  'socket-connection': 'Connecting to Server',
  'data-loading': 'Loading Data',
  complete: 'Ready',
} as const;
