/**
 * Application Bootstrap Service
 *
 * Runs the ordered startup sequence and publishes its state to the app shell.
 */

import { firstTimeSetupQueryOptions, useAuthStore, sessionManager } from '@domains/authentication';
import { useSearchStore } from '@domains/search';
import { useTubeStore } from '@domains/tubes';
import {
  initializeNetworkMonitor,
  cleanupNetworkMonitor,
  isOffline,
  resetNetworkState,
} from '@infra/connection';
import { logger } from '@infra/logger';
import { initializeSocket, cleanupSocket } from '@infra/socket';

import { validateCacheVersion } from '../cache/cacheVersionValidation';
import { queryClient } from '../cache/queryClient';
import { queryKeys } from '../cache/queryKeys';

import { clearChunkReloadFlag } from './chunkErrorRecovery';

import type { AppBootstrapState, BootstrapStep } from './types';

/** Delay before heavy init so the loading screen can paint first. */
const LOADING_SCREEN_RENDER_DELAY_MS = 500;

/**
 * Socket.IO reports transport failures as free-text; match the known offline-ish
 * ones so we show the offline screen instead of a hard error.
 */
const OFFLINE_ERROR_FRAGMENTS = ['xhr poll error', 'timeout', 'network'];

class AppBootstrapService {
  private state: AppBootstrapState = {
    isLoading: true,
    currentStep: 'initialization',
    error: null,
  };

  private listeners: Array<(state: AppBootstrapState) => void> = [];
  private isInitialized = false;
  private inFlight: Promise<void> | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    this.authUnsubscribe = this.setupAuthSubscription();
  }

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

  private updateStep(step: BootstrapStep, error?: string) {
    this.state.currentStep = step;
    if (error) {
      this.state.error = error;
      this.state.currentStep = 'error';
    }
    this.notify();
  }

  private setOfflineError() {
    this.state.currentStep = 'error';
    this.state.error = 'OFFLINE_DURING_INIT';
    this.state.isLoading = false;
    this.isInitialized = false;
    this.notify();
  }

  // Resets domain UI stores on logout; login reconnection is handled by useAuthSocketSync.
  private setupAuthSubscription(): () => void {
    let wasAuthenticated = useAuthStore.getState().isAuthenticated;
    return useAuthStore.subscribe(state => {
      const isAuthenticated = state.isAuthenticated;

      if (wasAuthenticated && !isAuthenticated) {
        useTubeStore.getState().resetStore();
        useSearchStore.getState().clearSearch();

        // Clear all user queries (presence, list) to ensure fresh state on next login
        queryClient.removeQueries({ queryKey: queryKeys.users.all });

        // Disconnect socket to trigger user_offline event on server
        // This notifies other clients that this user is no longer online
        cleanupSocket();
      }

      wasAuthenticated = isAuthenticated;
    });
  }

  async bootstrap(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Bootstrap already initialized, skipping duplicate');
      return;
    }

    // isInitialized only flips at the end, so a second caller during a run — StrictMode's double
    // effect — would start its own. Callers join the run already in flight instead.
    this.inFlight ??= this.runBootstrap().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async runBootstrap(): Promise<void> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      this.notify();

      this.updateStep('initialization');
      await new Promise(resolve => setTimeout(resolve, LOADING_SCREEN_RENDER_DELAY_MS));

      // Warm the first-time setup check so the auth gateway reflects current server
      // truth before first paint (checkFirstTime swallows errors, returning safe defaults).
      this.updateStep('auth-check');
      await queryClient.prefetchQuery(firstTimeSetupQueryOptions);

      // SessionService already loaded tokens in constructor, now sync with auth store
      this.updateStep('session-restore');
      try {
        const authStore = useAuthStore.getState();
        authStore.initializeFromStorage();
      } catch (error) {
        logger.error('Bootstrap session restoration failed', { error });
        // Non-fatal: Continue bootstrap even if session restoration fails
        // User will simply need to log in again
      }

      // Drops the persisted cache if the server version changed or the DB was reset.
      this.updateStep('cache-validation');
      try {
        const tokens = sessionManager.getTokens();
        const accessToken = tokens?.accessToken ?? null;
        const labId = useAuthStore.getState().user?.labId;
        const result = await validateCacheVersion(accessToken, labId);

        if (!result.isValid) {
          logger.info('Cache invalidated due to version mismatch', {
            serverVersion: result.serverVersion,
            cachedVersion: result.cachedVersion,
          });
        }
      } catch (error) {
        logger.warn('Cache validation failed, continuing with existing cache', { error });
        // Non-fatal: Continue even if validation fails
      }

      this.updateStep('socket-connection');

      // Early offline detection - check before attempting network operations
      if (!navigator.onLine) {
        logger.warn('Browser reports offline state during bootstrap');
        this.setOfflineError();
        return;
      }

      try {
        // Initialize network monitoring first and wait for connectivity verification
        // This ensures NetworkMonitor is ready before socket starts connecting
        const networkMonitor = initializeNetworkMonitor(queryClient);
        await networkMonitor.waitForInitialization();

        if (isOffline()) {
          logger.warn('Network monitor detected offline state during bootstrap');
          this.setOfflineError();
          return;
        }

        // Socket will notify NetworkMonitor of connection state changes
        await initializeSocket(queryClient);
      } catch (socketError) {
        const errorMessage =
          socketError instanceof Error ? socketError.message : String(socketError);
        const isOfflineError =
          OFFLINE_ERROR_FRAGMENTS.some(fragment => errorMessage.includes(fragment)) ||
          !navigator.onLine;

        if (isOfflineError) {
          logger.warn('Offline-related error during bootstrap', { socketError });
          this.setOfflineError();
          return;
        }

        logger.error('Bootstrap real-time systems initialization failed', { socketError });
        this.updateStep('socket-connection', 'Failed to initialize real-time systems');
        throw socketError;
      }

      // No explicit fetch: React Query loads data on demand and Socket.IO keeps it fresh.
      this.updateStep('data-loading');

      this.updateStep('complete');
      this.state.isLoading = false;
      this.isInitialized = true;

      // Clear chunk reload flag after successful bootstrap
      // This allows future chunk errors to trigger a reload
      clearChunkReloadFlag();

      this.notify();
    } catch (error) {
      // Step handlers set a descriptive error before throwing; fall back to the raw message.
      if (!this.state.error) {
        this.state.error = error instanceof Error ? error.message : 'Bootstrap failed';
      }
      this.state.currentStep = 'error';
      this.state.isLoading = false;
      this.isInitialized = false;
      this.notify();
    }
  }

  public cleanup(): void {
    cleanupSocket();
    cleanupNetworkMonitor();
    this.authUnsubscribe?.();
    this.authUnsubscribe = null;
    this.isInitialized = false;
  }

  retry(): void {
    // Reset network state so we get fresh connectivity check on retry
    resetNetworkState();
    cleanupNetworkMonitor();

    this.isInitialized = false;
    void this.bootstrap();
  }
}

export const appBootstrapService = new AppBootstrapService();
