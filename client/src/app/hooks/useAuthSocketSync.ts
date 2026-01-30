/**
 * Auth Socket Sync
 *
 * Reconnects socket on login to enable presence tracking with authenticated session.
 */
import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@domains/authentication';
import { cleanupSocket, initializeSocket } from '@infra/socket/SocketService';
import { logger } from '@shared/infrastructure/logger';

export function useAuthSocketSync(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const wasAuthenticatedRef = useRef(isAuthenticated);
  const isReconnectingRef = useRef(false);

  useEffect(() => {
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
