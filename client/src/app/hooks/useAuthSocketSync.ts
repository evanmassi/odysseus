/**
 * Auth Socket Sync
 *
 * Reconnects socket on login to enable presence tracking with authenticated session.
 * Skips first mount to avoid race condition with AppBootstrapService socket initialization.
 */
import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@domains/authentication';
import { logger } from '@infra/logger';
import { cleanupSocket, initializeSocket } from '@infra/socket';

export function useAuthSocketSync(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const wasAuthenticatedRef = useRef(isAuthenticated);
  const isReconnectingRef = useRef(false);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    // Skip first mount - bootstrap handles socket init for restored sessions.
    // This prevents race condition where both bootstrap and this hook try to
    // initialize/cleanup socket simultaneously, causing cascading re-renders.
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    const wasAuthenticated = wasAuthenticatedRef.current;

    // Reconnect socket on login transition to get fresh auth token
    if (!wasAuthenticated && isAuthenticated && !isReconnectingRef.current) {
      isReconnectingRef.current = true;

      logger.debug('[useAuthSocketSync] Login detected, reconnecting socket');

      cleanupSocket();
      void initializeSocket(queryClient)
        .catch(error => {
          logger.error('[useAuthSocketSync] Socket reconnection failed', { error });
        })
        .finally(() => {
          isReconnectingRef.current = false;
        });
    }

    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);
}
