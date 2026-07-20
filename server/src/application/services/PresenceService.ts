/**
 * User Presence Service
 *
 * In-memory socket presence tracking with multi-tab safety.
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
  // userId → ConnectedUser (one active connection per user)
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  // socketId → userId (reverse lookup for disconnect)
  private socketToUser: Map<string, string> = new Map();

  registerConnection(userId: string, socketId: string, username: string, labId?: string): void {
    const existing = this.connectedUsers.get(userId);
    if (existing) {
      this.socketToUser.delete(existing.socketId);
      logger.debug('User reconnected, replacing old socket', {
        userId,
        oldSocketId: existing.socketId,
        newSocketId: socketId,
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
      onlineCount: this.connectedUsers.size,
    });
  }

  // Only removes if THIS socket is the active one — closing a stale tab must not evict a newer connection.
  removeConnection(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) {
      return undefined;
    }

    const connectedUser = this.connectedUsers.get(userId);
    if (connectedUser?.socketId === socketId) {
      this.connectedUsers.delete(userId);
      logger.info('User disconnected from presence', {
        userId,
        username: connectedUser.username,
        socketId,
        onlineCount: this.connectedUsers.size,
      });
    }

    this.socketToUser.delete(socketId);
    return userId;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineUserIdsForLab(labId: string): string[] {
    return Array.from(this.connectedUsers.values())
      .filter(u => u.labId === labId)
      .map(u => u.userId);
  }

  getOnlineCount(): number {
    return this.connectedUsers.size;
  }
}
