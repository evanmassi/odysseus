/**
 * App Bootstrap Module
 *
 * Initialization sequence for authentication, configuration, and socket setup.
 */

export { AppBootstrapService, appBootstrapService } from './AppBootstrapService';

export { useAppBootstrap } from './useAppBootstrap';

export type {
  AppBootstrapState,
  BootstrapStep,
  BootstrapStepInfo,
  BootstrapError,
  BootstrapInitializationResult,
  UseAppBootstrapResult,
} from './types';

export { BOOTSTRAP_STEPS } from './constants';
