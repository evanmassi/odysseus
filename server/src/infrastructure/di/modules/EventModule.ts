/**
 * Event DI Module
 *
 * Lazy-singleton wiring for socket event handlers and presence tracking.
 */

import { ResearcherApprovalEventHandler } from '@application/event-handlers/ResearcherApprovalEventHandler';
import { SocketEventHandler } from '@application/event-handlers/SocketEventHandler';
import { PresenceService } from '@application/services/PresenceService';
import type { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';
import type { SharedServices } from '@infrastructure/di/SharedServices';
import { logger } from '@infrastructure/logging/logger';

import type { Server as SocketIOServer } from 'socket.io';

export class EventModule {
  private socketIO?: SocketIOServer;
  private presenceService?: PresenceService;
  private socketEventHandler?: SocketEventHandler;
  private researcherApprovalEventHandler?: ResearcherApprovalEventHandler;

  constructor(
    private shared: SharedServices,
    private repositoryFactory: RepositoryFactory
  ) {}

  setSocketIO(io: SocketIOServer): void {
    this.socketIO = io;
  }

  getPresenceService(): PresenceService {
    if (!this.presenceService) {
      this.presenceService = new PresenceService();
    }
    return this.presenceService;
  }

  getSocketEventHandler(): SocketEventHandler | null {
    if (!this.socketIO) {
      logger.warn('Socket.IO not initialized. Call setSocketIO() first.');
      return null;
    }

    if (!this.socketEventHandler) {
      this.socketEventHandler = new SocketEventHandler(
        this.socketIO,
        this.shared.eventBus,
        this.getPresenceService()
      );
    }
    return this.socketEventHandler;
  }

  getResearcherApprovalEventHandler(): ResearcherApprovalEventHandler {
    if (!this.researcherApprovalEventHandler) {
      const repositories = this.repositoryFactory.getRepositories();
      this.researcherApprovalEventHandler = new ResearcherApprovalEventHandler(
        this.shared.eventBus,
        repositories.researchers,
        repositories.users,
        repositories.persons
      );
    }
    return this.researcherApprovalEventHandler;
  }
}
