/**
 * Application bootstrap service
 */

import { authService } from '@domains/authentication/services/AuthenticationService';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { useSearchStore } from '@domains/search/stores/searchStore';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { initializeNetworkMonitor, cleanupNetworkMonitor } from '@infra/connection/networkMonitor';
import { isOffline, resetNetworkState } from '@infra/connection/networkState';
import { initializeOptimisticUpdates } from '@infra/optimistic/optimisticUpdates';
import { initializeSocket, cleanupSocket } from '@infra/socket/SocketService';
import { logger } from '@shared/infrastructure/logger';

import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

import { BOOTSTRAP_STEPS } from './constants';

import type { AppBootstrapState, BootstrapStep } from './types';
import type { QueryClient } from '@tanstack/react-query';

export class AppBootstrapService {
  private state: AppBootstrapState = {
    isLoading: true,
    currentStep: 'initialization',
    error: null,
    steps: [...BOOTSTRAP_STEPS],
    flags: {
      firstTimeSetupRequired: false,
    },
  };

  private listeners: Array<(state: AppBootstrapState) => void> = [];
  private isInitialized = false;

  subscribe(listener: (state: AppBootstrapState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): AppBootstrapState {
    return { ...this.state };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private updateStep(step: BootstrapStep, completed: boolean, error?: string) {
    this.state.currentStep = step;
    const stepIndex = this.state.steps.findIndex(s => s.step === step);
    if (stepIndex !== -1) {
      this.state.steps[stepIndex] = {
        ...this.state.steps[stepIndex],
        completed,
        error,
      };
    }
    if (error) {
      this.state.error = error;
      this.state.currentStep = 'error';
    }
    this.notify();
  }

  async bootstrap(queryClient: QueryClient): Promise<void> {
    // GUARD: Prevent duplicate bootstrap in React StrictMode
    if (this.isInitialized) {
      logger.warn('Bootstrap already initialized, skipping duplicate');
      return;
    }

    try {
      this.state.isLoading = true;
      this.state.error = null;
      this.notify();

      // Initialize
      this.updateStep('initialization', false);
      await new Promise(resolve => setTimeout(resolve, 500));
      this.updateStep('initialization', true);

      // Check auth - detect first-time setup
      this.updateStep('auth-check', false);
      try {
        const isFirstTime = await authService.checkFirstTime();

        if (isFirstTime) {
          this.state.flags.firstTimeSetupRequired = true;
        } else {
          this.state.flags.firstTimeSetupRequired = false;
        }

        this.updateStep('auth-check', true);
      } catch (error) {
        logger.error('Bootstrap auth check failed', { error });
        this.updateStep('auth-check', false, 'Failed to check authentication status');
        throw error;
      }

      // Restore session from SessionManager
      // SessionManager already loaded tokens in constructor, now sync with auth store
      this.updateStep('session-restore', false);
      try {
        const authStore = useAuthStore.getState();
        authStore.initializeFromStorage();
        this.updateStep('session-restore', true);
      } catch (error) {
        logger.error('Bootstrap session restoration failed', { error });
        // Non-fatal: Continue bootstrap even if session restoration fails
        // User will simply need to log in again
        this.updateStep('session-restore', true);
      }

      // Initialize advanced real-time systems
      this.updateStep('socket-connection', false);

      // Early offline detection - check before attempting network operations
      if (!navigator.onLine) {
        logger.warn('Browser reports offline state during bootstrap');
        this.state.currentStep = 'error';
        this.state.error = 'OFFLINE_DURING_INIT';
        this.state.isLoading = false;
        this.isInitialized = false;
        this.notify();
        return; // Exit bootstrap early, don't throw error
      }

      try {
        // Initialize network monitoring first and wait for connectivity verification
        // This ensures NetworkMonitor is ready before socket starts connecting
        const networkMonitor = initializeNetworkMonitor(queryClient);
        await networkMonitor.waitForInitialization();

        // Check if network monitor detected offline state (uses shared networkState)
        if (isOffline()) {
          logger.warn('Network monitor detected offline state during bootstrap');
          this.state.currentStep = 'error';
          this.state.error = 'OFFLINE_DURING_INIT';
          this.state.isLoading = false;
          this.isInitialized = false;
          this.notify();
          return; // Exit bootstrap early, don't throw error
        }

        // Initialize optimistic updates service
        initializeOptimisticUpdates(queryClient);

        // Initialize socket with React Query integration
        // Socket will notify NetworkMonitor of connection state changes
        await initializeSocket(queryClient);

        this.updateStep('socket-connection', true);
      } catch (socketError) {
        // Check if this is an offline-related error
        const errorMessage =
          socketError instanceof Error ? socketError.message : String(socketError);
        const isOfflineError =
          errorMessage.includes('xhr poll error') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          !navigator.onLine;

        if (isOfflineError) {
          logger.warn('Offline-related error during bootstrap', { socketError });
          this.state.currentStep = 'error';
          this.state.error = 'OFFLINE_DURING_INIT';
          this.state.isLoading = false;
          this.isInitialized = false;
          this.notify();
          return; // Exit bootstrap early with offline state
        }

        logger.error('Bootstrap real-time systems initialization failed', { socketError });
        this.updateStep('socket-connection', false, 'Failed to initialize real-time systems');
        throw socketError;
      }

      // Data loading handled by React Query (on-demand, component-driven)
      // Components call hooks (useTubesQuery, useResearchersQuery, etc.)
      // Socket.IO keeps cache fresh via real-time invalidation
      this.updateStep('data-loading', false);
      this.updateStep('data-loading', true);

      // Complete
      this.updateStep('complete', true);
      this.state.isLoading = false;
      this.isInitialized = true;
      this.notify();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bootstrap failed';
      this.updateStep('error', false, errorMessage);
      this.state.isLoading = false;
      this.isInitialized = false; // Allow retry after error
    }
  }

  /**
   * Cleanup resources on app shutdown
   */
  public cleanup(): void {
    cleanupSocket();
    cleanupNetworkMonitor();
    this.isInitialized = false; // Allow re-initialization after cleanup
  }

  retry(queryClient: QueryClient): void {
    this.state.steps = this.state.steps.map(step => ({
      ...step,
      completed: false,
      error: undefined,
    }));

    // Reset network state so we get fresh connectivity check on retry
    resetNetworkState();
    cleanupNetworkMonitor();

    this.isInitialized = false; // Reset flag to allow retry
    void this.bootstrap(queryClient);
  }
}

export const appBootstrapService = new AppBootstrapService();

/**
 * Session cleanup subscription
 *
 * Listens to auth state changes and resets domain UI stores on logout.
 * This keeps authentication domain decoupled from feature domains.
 */
let wasAuthenticated = useAuthStore.getState().isAuthenticated;
useAuthStore.subscribe(state => {
  const isAuthenticated = state.isAuthenticated;

  if (!wasAuthenticated && isAuthenticated) {
    // User logged in - reconnect socket with authentication
    // This ensures presence tracking works (socket may have connected without auth during initial bootstrap)
    cleanupSocket();
    void initializeSocket(queryClient);
  }

  if (wasAuthenticated && !isAuthenticated) {
    // User logged out - reset all domain UI state
    useTubeStore.getState().resetStore();
    useSearchStore.getState().clearSearch();

    // Clear presence cache to ensure fresh state on next login
    // This prevents stale online user badges from appearing
    queryClient.setQueryData(queryKeys.users.presence(), []);

    // Disconnect socket to trigger user_offline event on server
    // This notifies other clients that this user is no longer online
    cleanupSocket();
  }

  wasAuthenticated = isAuthenticated;
});
