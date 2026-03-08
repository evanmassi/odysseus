/**
 * Socket → Query Cache Bridge
 *
 * Centralizes all socket event handling and React Query cache synchronization.
 */

import { z } from 'zod';

import { queryKeys } from '@app/cache/queryKeys';
import { getNetworkMonitor } from '@infra/connection';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

const tubeEventSchemas = {
  tube_created: z.object({
    tubeId: z.string(),
    location: z.object({
      tankId: z.string(),
      rackId: z.string(),
      boxId: z.string(),
      position: z.number(),
    }),
    createdBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_updated: z.object({
    tubeId: z.string(),
    oldLocation: z.object({
      tankId: z.string(),
      rackId: z.string(),
      boxId: z.string(),
      position: z.number(),
    }),
    newLocation: z.object({
      tankId: z.string(),
      rackId: z.string(),
      boxId: z.string(),
      position: z.number(),
    }),
    updatedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_deleted: z.object({
    tubeId: z.string(),
    location: z.object({
      tankId: z.string(),
      rackId: z.string(),
      boxId: z.string(),
      position: z.number(),
    }),
    deletedBy: z.string(),
    updatedAt: z.string(),
  }),

  tubes_bulk_updated: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    operation: z.string(),
    updatedBy: z.string(),
    updatedAt: z.string(),
  }),

  tubes_locked: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    lockedBy: z.string(),
    lockNote: z.string().optional(),
    updatedAt: z.string(),
  }),

  tubes_unlocked: z.object({
    tubeIds: z.array(z.string()),
    count: z.number(),
    unlockedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_access_shared: z.object({
    tubeIds: z.array(z.string()),
    addedUserIds: z.array(z.string()),
    tubeSharedUsers: z.array(
      z.object({
        tubeId: z.string(),
        sharedWithUserIds: z.array(z.string()),
      })
    ),
    sharedBy: z.string(),
    updatedAt: z.string(),
  }),

  tube_access_revoked: z.object({
    tubeIds: z.array(z.string()),
    revokedUserIds: z.array(z.string()),
    tubeSharedUsers: z.array(
      z.object({
        tubeId: z.string(),
        sharedWithUserIds: z.array(z.string()),
      })
    ),
    revokedBy: z.string(),
    updatedAt: z.string(),
  }),
} as const;

const researcherEventSchema = z.object({
  researcherId: z.string(),
  eventType: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
  // Only present on researcher_created
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  position: z.string().optional(),
});

const researcherDeletedSchema = z.object({
  researcherId: z.string(),
  eventType: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  deletedBy: z.string(),
  updatedAt: z.string(),
});

const researcherEventSchemas = {
  researcher_created: researcherEventSchema,
  researcher_updated: researcherEventSchema,
  researcher_deactivated: researcherEventSchema,
  researcher_reactivated: researcherEventSchema,
  researcher_deleted: researcherDeletedSchema,
} as const;

const configurationEventSchemas = {
  configuration_updated: z.object({
    eventTypes: z.array(z.string()),
    eventCount: z.number(),
    updatedAt: z.string(),
    changedBy: z.string(),
  }),
} as const;

const userEventSchemas = {
  user_approved: z.object({
    userId: z.string(),
    username: z.string(),
    approvedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_deleted: z.object({
    userId: z.string(),
    username: z.string(),
    deletedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_role_changed: z.object({
    userId: z.string(),
    username: z.string(),
    oldRole: z.string(),
    newRole: z.string(),
    changedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_created: z.object({
    userId: z.string(),
    username: z.string(),
    role: z.string(),
    updatedAt: z.string(),
  }),
  user_linked_to_researcher: z.object({
    userId: z.string(),
    username: z.string(),
    researcherId: z.string(),
    researcherName: z.string(),
    linkedBy: z.string(),
    updatedAt: z.string(),
  }),
  user_unlinked_from_researcher: z.object({
    userId: z.string(),
    username: z.string(),
    researcherId: z.string(),
    researcherName: z.string(),
    unlinkedBy: z.string(),
    updatedAt: z.string(),
  }),
} as const;

const presenceEventSchemas = {
  user_online: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
  user_offline: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
  // Response to explicit request_presence — authoritative initial state
  presence_state: z.object({
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
} as const;

class SocketQueryBridge {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isConnected = false;
  private isInitialized = false;

  // Persists across socket reconnections for version-change detection
  private lastKnownConfigVersion: number | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  public initializeSocket(socket: Socket): void {
    if (this.isInitialized) {
      logger.warn('Socket bridge already initialized, skipping duplicate initialization');
      return;
    }

    this.socket = socket;
    this.setupConnectionHandlers();
    this.setupTubeEventHandlers();
    this.setupTubeLockEventHandlers();
    this.setupResearcherEventHandlers();
    this.setupUserEventHandlers();
    this.setupPresenceEventHandlers();
    this.setupConfigurationEventHandlers();
    this.setupReconnectionHandlers();

    this.isInitialized = true;
  }

  /** Preserves session state (version tracking) across reconnections. */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isInitialized = false;
    }
  }

  // CONNECTION EVENT HANDLERS

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;

      if (this.lastKnownConfigVersion === null) {
        const currentConfig = this.queryClient.getQueryData(
          queryKeys.storage.data()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Query cache data with unknown structure before validation
        ) as any;
        const currentVersion = currentConfig?.configuration?.systemConfig?.version;

        if (currentVersion) {
          this.lastKnownConfigVersion = currentVersion;
        }
      }

      // More reliable than catching user_online broadcast during connection
      this.socket?.emit('request_presence');

      getNetworkMonitor()?.notifySocketConnected();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      logger.warn('Socket disconnected', { reason, timestamp: new Date().toISOString() });

      if (reason !== 'io client disconnect') {
        getNetworkMonitor()?.notifySocketDisconnected();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('Socket connection error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // TUBE EVENT HANDLERS

  private setupTubeEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('tube_created', (data: unknown) => {
      try {
        const { location } = tubeEventSchemas.tube_created.parse(data);

        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
        });
        // Used by TubeEditorModal position analysis
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_created event', { error });
      }
    });

    this.socket.on('tube_updated', (data: unknown) => {
      try {
        const { tubeId, oldLocation, newLocation } = tubeEventSchemas.tube_updated.parse(data);

        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.detail(tubeId),
        });
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            oldLocation.tankId,
            oldLocation.rackId,
            oldLocation.boxId
          ),
        });

        if (
          oldLocation.tankId !== newLocation.tankId ||
          oldLocation.rackId !== newLocation.rackId ||
          oldLocation.boxId !== newLocation.boxId
        ) {
          void this.queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              newLocation.tankId,
              newLocation.rackId,
              newLocation.boxId
            ),
          });
        }

        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_updated event', { error });
      }
    });

    this.socket.on('tube_deleted', (data: unknown) => {
      try {
        const { tubeId, location } = tubeEventSchemas.tube_deleted.parse(data);

        this.queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
        });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_deleted event', { error });
      }
    });

    this.socket.on('tubes_bulk_updated', (data: unknown) => {
      try {
        tubeEventSchemas.tubes_bulk_updated.parse(data);
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      } catch (error) {
        logger.error('Invalid tubes_bulk_updated event', { error });
      }
    });
  }

  // TUBE LOCK EVENT HANDLERS — patches cache directly instead of invalidation

  private setupTubeLockEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('tubes_locked', (data: unknown) => {
      try {
        const { tubeIds, lockedBy, lockNote, updatedAt } =
          tubeEventSchemas.tubes_locked.parse(data);

        this.patchTubesInCache(tubeIds, tube => ({
          ...tube,
          isLocked: true,
          lockedBy,
          lockNote,
          lockedAt: updatedAt,
        }));
      } catch (error) {
        logger.error('Invalid tubes_locked event', { error });
      }
    });

    this.socket.on('tubes_unlocked', (data: unknown) => {
      try {
        const { tubeIds } = tubeEventSchemas.tubes_unlocked.parse(data);

        this.patchTubesInCache(tubeIds, tube => ({
          ...tube,
          isLocked: false,
          lockedBy: undefined,
          lockNote: undefined,
          lockedAt: undefined,
          sharedWithUserIds: undefined,
        }));
      } catch (error) {
        logger.error('Invalid tubes_unlocked event', { error });
      }
    });

    this.socket.on('tube_access_shared', (data: unknown) => {
      try {
        const { tubeSharedUsers } = tubeEventSchemas.tube_access_shared.parse(data);
        const sharedUsersMap = new Map(tubeSharedUsers.map(t => [t.tubeId, t.sharedWithUserIds]));

        this.patchTubesInCache([...sharedUsersMap.keys()], tube => {
          const newSharedUsers = sharedUsersMap.get(tube.id);
          if (!newSharedUsers) return tube;
          return {
            ...tube,
            sharedWithUserIds: newSharedUsers.length > 0 ? newSharedUsers : undefined,
          };
        });
      } catch (error) {
        logger.error('Invalid tube_access_shared event', { error });
      }
    });

    this.socket.on('tube_access_revoked', (data: unknown) => {
      try {
        const { tubeSharedUsers } = tubeEventSchemas.tube_access_revoked.parse(data);
        const sharedUsersMap = new Map(tubeSharedUsers.map(t => [t.tubeId, t.sharedWithUserIds]));

        this.patchTubesInCache([...sharedUsersMap.keys()], tube => {
          const newSharedUsers = sharedUsersMap.get(tube.id);
          if (newSharedUsers === undefined) return tube;
          return {
            ...tube,
            sharedWithUserIds: newSharedUsers.length > 0 ? newSharedUsers : undefined,
          };
        });
      } catch (error) {
        logger.error('Invalid tube_access_revoked event', { error });
      }
    });
  }

  private patchTubesInCache(tubeIds: string[], patchFn: (tube: TubeData) => TubeData): void {
    const tubeIdSet = new Set(tubeIds);

    this.queryClient.setQueriesData<TubeData[] | TubeData | undefined>(
      { queryKey: queryKeys.tubes.all },
      oldData => {
        if (!oldData) return oldData;

        if (Array.isArray(oldData)) {
          return oldData.map(tube => (tubeIdSet.has(tube.id) ? patchFn(tube) : tube));
        }

        if (typeof oldData === 'object' && 'id' in oldData && tubeIdSet.has(oldData.id)) {
          return patchFn(oldData);
        }

        return oldData;
      }
    );
  }

  // RESEARCHER EVENT HANDLERS — all invalidate researchers + tube stats

  private setupResearcherEventHandlers(): void {
    if (!this.socket) return;

    for (const [event, schema] of Object.entries(researcherEventSchemas)) {
      this.socket.on(event, (data: unknown) => {
        try {
          schema.parse(data);
          void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
          void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        } catch (error) {
          logger.error(`Invalid ${event} event`, { error });
        }
      });
    }
  }

  // USER EVENT HANDLERS

  private setupUserEventHandlers(): void {
    if (!this.socket) return;

    const userListAndAdmin = [queryKeys.users.list(), queryKeys.admin.users()] as const;
    const userListAdminAndResearchers = [...userListAndAdmin, queryKeys.researchers.all] as const;

    const userEventHandlers: {
      event: keyof typeof userEventSchemas;
      invalidate: ReadonlyArray<readonly unknown[]>;
    }[] = [
      { event: 'user_approved', invalidate: userListAndAdmin },
      { event: 'user_deleted', invalidate: userListAndAdmin },
      { event: 'user_role_changed', invalidate: userListAndAdmin },
      { event: 'user_created', invalidate: [queryKeys.admin.users()] },
      { event: 'user_linked_to_researcher', invalidate: userListAdminAndResearchers },
      { event: 'user_unlinked_from_researcher', invalidate: userListAdminAndResearchers },
    ];

    for (const { event, invalidate } of userEventHandlers) {
      this.socket.on(event, (data: unknown) => {
        try {
          userEventSchemas[event].parse(data);
          for (const queryKey of invalidate) {
            void this.queryClient.invalidateQueries({ queryKey });
          }
        } catch (error) {
          logger.error(`Invalid ${event} event`, { error });
        }
      });
    }
  }

  // PRESENCE EVENT HANDLERS — writes authoritative server list directly to cache

  private setupPresenceEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('user_online', (data: unknown) => {
      try {
        const { userId, onlineUserIds } = presenceEventSchemas.user_online.parse(data);

        this.queryClient.setQueryData(queryKeys.users.presence(), onlineUserIds);

        // If the new user isn't in our cached list, refetch so we can display their badge
        const cachedUsers = this.queryClient.getQueryData<Array<{ id: string }>>(
          queryKeys.users.list()
        );
        if (cachedUsers && !cachedUsers.some(u => u.id === userId)) {
          void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
        }
      } catch (error) {
        logger.error('Invalid user_online event', { error });
      }
    });

    this.socket.on('user_offline', (data: unknown) => {
      try {
        const { onlineUserIds } = presenceEventSchemas.user_offline.parse(data);
        this.queryClient.setQueryData(queryKeys.users.presence(), onlineUserIds);
      } catch (error) {
        logger.error('Invalid user_offline event', { error });
      }
    });

    this.socket.on('presence_state', (data: unknown) => {
      try {
        const { onlineUserIds } = presenceEventSchemas.presence_state.parse(data);
        this.queryClient.setQueryData(queryKeys.users.presence(), onlineUserIds);
      } catch (error) {
        logger.error('Invalid presence_state event', { error });
      }
    });
  }

  // CONFIGURATION EVENT HANDLERS

  private setupConfigurationEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('configuration_updated', async (data: unknown) => {
      try {
        const { eventTypes, eventCount } =
          configurationEventSchemas.configuration_updated.parse(data);

        const versionChanged = await this.invalidateConfigurationIfChanged();

        if (versionChanged) {
          const message = this.generateConfigurationUpdateMessage(eventTypes, eventCount);
          notifications.info(message);
        }
      } catch (error) {
        logger.error('Error handling configuration_updated event', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          receivedData: data,
          timestamp: new Date().toISOString(),
        });

        // Graceful degradation — invalidate anyway to ensure consistency
        try {
          await this.queryClient.invalidateQueries({
            queryKey: queryKeys.storage.data(),
          });
        } catch (fallbackError) {
          logger.error('Critical: Failed to invalidate cache in error handler', { fallbackError });
          notifications.error('Configuration sync error. Please refresh the page.');
        }
      }
    });
  }

  /** Detects database resets (version going backward). */
  private async invalidateConfigurationIfChanged(): Promise<boolean> {
    try {
      const currentVersion = this.lastKnownConfigVersion;

      await this.queryClient.invalidateQueries({
        queryKey: queryKeys.storage.data(),
      });

      const freshData = (await this.queryClient.fetchQuery({
        queryKey: queryKeys.storage.data(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Query result with unknown structure before validation
      })) as any;

      const newVersion = freshData?.configuration?.systemConfig?.version;

      // First event — no baseline, assume changed
      if (currentVersion === null && newVersion !== undefined) {
        this.lastKnownConfigVersion = newVersion;
        return true;
      }

      if (currentVersion !== undefined && currentVersion !== null && newVersion !== undefined) {
        const versionChanged = currentVersion !== newVersion;

        if (newVersion < currentVersion) {
          logger.warn('Database reset detected', {
            previous: currentVersion,
            current: newVersion,
            difference: currentVersion - newVersion,
          });

          notifications.warning(
            'Database was reset. Your local settings have been synchronized with the server.'
          );
        }

        this.lastKnownConfigVersion = newVersion;
        return versionChanged;
      }

      return true;
    } catch (error) {
      logger.error('Error checking configuration version', { error });
      return true;
    }
  }

  private generateConfigurationUpdateMessage(eventTypes: string[], eventCount: number): string {
    if (eventTypes.length === 1) {
      const eventType = eventTypes[0];

      if (eventType.includes('Tank')) {
        if (eventType === 'TankAdded') return 'Storage tank added';
        if (eventType === 'TankDeleted') return 'Storage tank removed';
        return 'Storage tank updated';
      }

      if (eventType.includes('Rack')) {
        if (eventType === 'RackAdded') return 'Rack added';
        if (eventType === 'RackDeleted') return 'Rack removed';
        return 'Rack updated';
      }

      if (eventType.includes('Box')) {
        if (eventType === 'BoxAdded') return 'Box added';
        if (eventType === 'BoxDeleted') return 'Box removed';
        return 'Box updated';
      }

      if (eventType === 'LabNameChanged') {
        return 'Lab name updated';
      }

      return 'Configuration updated';
    }

    if (eventCount > 5) {
      return `${eventCount} configuration changes applied`;
    }

    const hasAdded = eventTypes.some(t => t.includes('Added'));
    const hasDeleted = eventTypes.some(t => t.includes('Deleted'));
    const hasUpdated = eventTypes.some(t => t.includes('Updated'));

    if (hasAdded && hasDeleted) {
      return 'Equipment configuration modified';
    } else if (hasAdded) {
      return 'Equipment added to configuration';
    } else if (hasDeleted) {
      return 'Equipment removed from configuration';
    } else if (hasUpdated) {
      return 'Equipment configuration updated';
    }

    return 'Multiple configuration changes applied';
  }

  // RECONNECTION HANDLERS — Manager-level events (socket.io) in Socket.IO v4

  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.io.on('reconnect', () => {
      void this.queryClient.invalidateQueries();
    });

    this.socket.io.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to server after all attempts');
      notifications.error('Failed to reconnect to server. Please refresh the page.');
    });

    this.socket.io.on('reconnect_error', (error: Error) => {
      logger.error('Reconnection error', { error });
    });
  }
}

// Global Instance Management

let globalSocketBridge: SocketQueryBridge | null = null;

export const getSocketBridge = (queryClient: QueryClient): SocketQueryBridge => {
  if (!globalSocketBridge) {
    globalSocketBridge = new SocketQueryBridge(queryClient);
  }
  return globalSocketBridge;
};

/** Disconnects but preserves the singleton — session state (version tracking) survives. */
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
  }
};
