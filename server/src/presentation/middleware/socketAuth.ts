/**
 * Socket Authentication Middleware
 *
 * Authenticates Socket.IO connections using existing JWT tokens.
 * Attaches userId and username to socket instance for use in handlers.
 *
 * Design:
 * - Uses existing JwtSessionService for token validation
 * - Unauthenticated connections allowed (backward compatibility)
 * - Authentication failures logged but don't reject connection
 */

import type { Socket } from 'socket.io';
import type { ExtendedError } from 'socket.io/dist/namespace';
import type { SessionService } from '@application/commands/UserCommands';
import { logger } from '@utils/logger';

// Extend Socket interface with authenticated user info
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    username?: string;
    isDemo?: boolean;
    labId?: string;
  }
}

/**
 * Creates Socket.IO authentication middleware
 * Uses existing SessionService (JwtSessionService) from ServiceContainer
 */
export function createSocketAuthMiddleware(
  sessionService: SessionService
): (socket: Socket, next: (err?: ExtendedError) => void) => void {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        // Allow unauthenticated connections (they just won't have presence)
        // This maintains backward compatibility
        logger.debug('Socket connected without auth token', { socketId: socket.id });
        return next();
      }

      // Validate token using existing service
      const validation = await sessionService.validateSession(token);

      if (validation?.user) {
        socket.userId = validation.user.id;
        socket.username = validation.user.username;
        socket.isDemo = validation.user.isDemo;
        socket.labId = validation.user.labId;
        logger.debug('Socket authenticated', {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username,
          isDemo: socket.isDemo,
          labId: socket.labId
        });
      } else {
        logger.debug('Socket auth token invalid or expired', { socketId: socket.id });
      }

      next();
    } catch (error) {
      logger.error('Socket auth error', {
        error: error instanceof Error ? error.message : String(error),
        socketId: socket.id
      });
      // Don't reject - allow connection but without auth
      next();
    }
  };
}
