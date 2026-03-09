/**
 * Presence Service
 *
 * Tracks which users are currently connected via Socket.IO.
 * Provides real-time online/offline status for user presence awareness.
 *
 * Design:
 * - In-memory storage only (presence doesn't need persistence)
 * - O(1) lookups for both socket-to-user and user-to-socket mappings
 * - Multi-tab safe: closing an old tab doesn't remove a newer connection
 */

import { logger } from '@infrastructure/logging/logger';

interface ConnectedUser {
  userId: string;
  socketId: string;
  username: string;
  labId?: string;
  connectedAt: Date;
}

export class PresenceService {
  // userId → ConnectedUser (supports one active connection per user)
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  // socketId → userId (for quick lookup on disconnect)
  private socketToUser: Map<string, string> = new Map();

  /**
   * Register user connection
   * If user already connected (multi-tab), overwrites with new socket
   */
  registerConnection(userId: string, socketId: string, username: string, labId?: string): void {
    // Remove old socket mapping if user was already connected
    const existing = this.connectedUsers.get(userId);
    if (existing) {
      this.socketToUser.delete(existing.socketId);
      logger.debug('User reconnected, replacing old socket', {
        userId,
        oldSocketId: existing.socketId,
        newSocketId: socketId
      });
    }

    this.connectedUsers.set(userId, {
      userId,
      socketId,
      username,
      labId,
      connectedAt: new Date(),
    });
    this.socketToUser.set(socketId, userId);

    logger.info('User connected for presence', {
      userId,
      username,
      socketId,
      onlineCount: this.connectedUsers.size
    });
  }

  /**
   * Remove user connection
   * Only removes from connectedUsers if THIS socket is the active one
   * (prevents multi-tab bug where closing old tab removes new connection)
   *
   * @returns userId if user went offline, undefined otherwise
   */
  removeConnection(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return undefined;
    }

    // Only remove from connectedUsers if THIS socket is the active one
    const connectedUser = this.connectedUsers.get(userId);
    if (connectedUser?.socketId === socketId) {
      this.connectedUsers.delete(userId);
      logger.info('User disconnected from presence', {
        userId,
        username: connectedUser.username,
        socketId,
        onlineCount: this.connectedUsers.size
      });
    }

    // Always clean up socketToUser mapping
    this.socketToUser.delete(socketId);
    return userId;
  }

  /**
   * Get list of all online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if a specific user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get count of online users
   */
  getOnlineUserIdsForLab(labId: string): string[] {
    return Array.from(this.connectedUsers.values())
      .filter(u => u.labId === labId)
      .map(u => u.userId);
  }

  getOnlineCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected user details (for debugging/admin)
   */
  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }
}
