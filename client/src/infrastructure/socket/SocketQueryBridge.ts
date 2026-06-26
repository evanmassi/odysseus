/**
 * Socket → Query Cache Bridge
 *
 * Centralizes all socket event handling and React Query cache synchronization.
 */

import {
  tubeEventSchemas,
  researcherEventSchemas,
  configurationEventSchemas,
  userEventSchemas,
  presenceEventSchemas,
  systemAdminEventSchemas,
} from '@odysseus/shared-schemas';

import { queryKeys } from '@app/cache/queryKeys';
import { getNetworkMonitor } from '@infra/connection';
import { logger } from '@infra/logger';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

const CONFIG_CHANGE_SUMMARY_THRESHOLD = 5;

interface ParsableSchema<T> {
  parse(data: unknown): T;
}

class SocketQueryBridge {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private labId: string | undefined;
  private isInitialized = false;

  // Persists across socket reconnections for version-change detection
  private lastKnownConfigVersion: number | null = null;

  constructor(queryClient: QueryClient, labId: string | undefined) {
    this.queryClient = queryClient;
    this.labId = labId;
  }

  public initializeSocket(socket: Socket): void {
    if (this.isInitialized) {
      logger.warn('Socket bridge already initialized, skipping duplicate initialization');
      return;
    }

    this.socket = socket;
    this.setupConnectionHandlers();
    if (this.labId) {
      this.setupTubeEventHandlers();
      this.setupTubeLockEventHandlers();
      this.setupResearcherEventHandlers();
      this.setupUserEventHandlers();
      this.setupPresenceEventHandlers();
      this.setupConfigurationEventHandlers();
    } else {
      this.setupSystemAdminEventHandlers();
    }
    this.setupReconnectionHandlers();

    this.isInitialized = true;
  }

  /** Preserves session state (version tracking) across reconnections. */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;

      this.isInitialized = false;
    }
  }

  /** Registers a socket handler that validates the payload; invalid events are logged and skipped. */
  private registerHandler<T>(
    event: string,
    schema: ParsableSchema<T>,
    handler: (parsed: T) => void
  ): void {
    this.socket?.on(event, (data: unknown) => {
      try {
        handler(schema.parse(data));
      } catch (error) {
        logger.error(`Invalid ${event} event`, { error });
      }
    });
  }

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (this.lastKnownConfigVersion === null && this.labId) {
        const currentConfig = this.queryClient.getQueryData(
          queryKeys.storage.data(this.labId)
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

  private setupTubeEventHandlers(): void {
    if (!this.socket) return;

    this.registerHandler('tube_created', tubeEventSchemas.tube_created, ({ location }) => {
      if (!this.labId) return;
      this.invalidateTubeLocation(location);
      this.invalidateTubesListAndStats();
    });

    this.registerHandler(
      'tube_updated',
      tubeEventSchemas.tube_updated,
      ({ tubeId, oldLocation, newLocation }) => {
        if (!this.labId) return;

        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.detail(this.labId, tubeId),
        });
        this.invalidateTubeLocation(oldLocation);

        if (
          oldLocation.tankId !== newLocation.tankId ||
          oldLocation.rackId !== newLocation.rackId ||
          oldLocation.boxId !== newLocation.boxId
        ) {
          this.invalidateTubeLocation(newLocation);
        }

        this.invalidateTubesListAndStats();
      }
    );

    this.registerHandler('tube_deleted', tubeEventSchemas.tube_deleted, ({ tubeId, location }) => {
      if (!this.labId) return;

      this.queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(this.labId, tubeId) });
      this.invalidateTubeLocation(location);
      this.invalidateTubesListAndStats();
    });

    const bulkTubeEvents = [
      'tubes_bulk_created',
      'tubes_bulk_updated',
      'tubes_bulk_deleted',
      'tubes_bulk_moved',
    ] as const;

    for (const event of bulkTubeEvents) {
      this.registerHandler<unknown>(event, tubeEventSchemas[event], () => {
        if (!this.labId) return;
        this.invalidateTubesListAndStats();
      });
    }
  }

  // TUBE LOCK EVENT HANDLERS — patches cache directly instead of invalidation

  private setupTubeLockEventHandlers(): void {
    if (!this.socket) return;

    this.registerHandler(
      'tubes_locked',
      tubeEventSchemas.tubes_locked,
      ({ tubeIds, lockedBy, lockNote, updatedAt }) => {
        this.patchTubesInCache(tubeIds, tube => ({
          ...tube,
          isLocked: true,
          lockedBy,
          lockNote,
          lockedAt: updatedAt,
        }));
      }
    );

    this.registerHandler('tubes_unlocked', tubeEventSchemas.tubes_unlocked, ({ tubeIds }) => {
      this.patchTubesInCache(tubeIds, tube => ({
        ...tube,
        isLocked: false,
        lockedBy: undefined,
        lockNote: undefined,
        lockedAt: undefined,
        sharedWithUserIds: undefined,
      }));
    });

    this.registerHandler(
      'tube_access_shared',
      tubeEventSchemas.tube_access_shared,
      ({ tubeSharedUsers }) => {
        const sharedUsersMap = new Map(tubeSharedUsers.map(t => [t.tubeId, t.sharedWithUserIds]));

        this.patchTubesInCache([...sharedUsersMap.keys()], tube => {
          const newSharedUsers = sharedUsersMap.get(tube.id);
          if (!newSharedUsers) return tube;
          return {
            ...tube,
            sharedWithUserIds: newSharedUsers.length > 0 ? newSharedUsers : undefined,
          };
        });
      }
    );

    this.registerHandler(
      'tube_access_revoked',
      tubeEventSchemas.tube_access_revoked,
      ({ tubeSharedUsers }) => {
        const sharedUsersMap = new Map(tubeSharedUsers.map(t => [t.tubeId, t.sharedWithUserIds]));

        this.patchTubesInCache([...sharedUsersMap.keys()], tube => {
          const newSharedUsers = sharedUsersMap.get(tube.id);
          if (newSharedUsers === undefined) return tube;
          return {
            ...tube,
            sharedWithUserIds: newSharedUsers.length > 0 ? newSharedUsers : undefined,
          };
        });
      }
    );
  }

  private patchTubesInCache(tubeIds: string[], patchFn: (tube: TubeData) => TubeData): void {
    if (!this.labId) return;
    const tubeIdSet = new Set(tubeIds);

    this.queryClient.setQueriesData<TubeData[] | TubeData | undefined>(
      { queryKey: queryKeys.tubes.all(this.labId) },
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

  /** Refreshes the full tube list (used by TubeEditorModal position analysis) and tube stats. */
  private invalidateTubesListAndStats(): void {
    if (!this.labId) return;
    void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(this.labId) });
    void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(this.labId) });
  }

  private invalidateTubeLocation(location: {
    tankId: string;
    rackId: string;
    boxId: string;
  }): void {
    if (!this.labId) return;
    void this.queryClient.invalidateQueries({
      queryKey: queryKeys.tubes.location(
        this.labId,
        location.tankId,
        location.rackId,
        location.boxId
      ),
    });
  }

  // RESEARCHER EVENT HANDLERS — all invalidate researchers + tube stats

  private setupResearcherEventHandlers(): void {
    if (!this.socket) return;

    for (const [event, schema] of Object.entries(researcherEventSchemas)) {
      this.registerHandler<unknown>(event, schema, () => {
        if (!this.labId) return;
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.researchers.all(this.labId),
        });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(this.labId) });
      });
    }
  }

  private setupUserEventHandlers(): void {
    if (!this.socket) return;

    if (!this.labId) return;

    const userListAndAdmin = [
      queryKeys.users.list(this.labId),
      queryKeys.admin.users(this.labId),
    ] as const;
    const userListAdminAndResearchers = [
      ...userListAndAdmin,
      queryKeys.researchers.all(this.labId),
    ] as const;

    const userEventHandlers: {
      event: keyof typeof userEventSchemas;
      invalidate: ReadonlyArray<readonly unknown[]>;
    }[] = [
      { event: 'user_approved', invalidate: userListAndAdmin },
      { event: 'user_deleted', invalidate: userListAndAdmin },
      { event: 'user_role_changed', invalidate: userListAndAdmin },
      { event: 'user_created', invalidate: [queryKeys.admin.users(this.labId)] },
      { event: 'user_linked_to_researcher', invalidate: userListAdminAndResearchers },
      { event: 'user_unlinked_from_researcher', invalidate: userListAdminAndResearchers },
    ];

    for (const { event, invalidate } of userEventHandlers) {
      this.registerHandler<unknown>(event, userEventSchemas[event], () => {
        for (const queryKey of invalidate) {
          void this.queryClient.invalidateQueries({ queryKey });
        }
      });
    }
  }

  // PRESENCE EVENT HANDLERS — writes authoritative server list directly to cache

  private setupPresenceEventHandlers(): void {
    if (!this.socket) return;

    this.registerHandler(
      'user_online',
      presenceEventSchemas.user_online,
      ({ userId, onlineUserIds }) => {
        if (!this.labId) return;
        this.queryClient.setQueryData(queryKeys.users.presence(this.labId), onlineUserIds);

        // If the new user isn't in our cached list, refetch so we can display their badge
        const cachedUsers = this.queryClient.getQueryData<Array<{ id: string }>>(
          queryKeys.users.list(this.labId)
        );
        if (cachedUsers && !cachedUsers.some(u => u.id === userId)) {
          void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list(this.labId) });
        }
      }
    );

    this.registerHandler('user_offline', presenceEventSchemas.user_offline, ({ onlineUserIds }) => {
      if (!this.labId) return;
      this.queryClient.setQueryData(queryKeys.users.presence(this.labId), onlineUserIds);
    });

    this.registerHandler(
      'presence_state',
      presenceEventSchemas.presence_state,
      ({ onlineUserIds }) => {
        if (!this.labId) return;
        this.queryClient.setQueryData(queryKeys.users.presence(this.labId), onlineUserIds);
      }
    );
  }

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
          if (!this.labId) return;
          await this.queryClient.invalidateQueries({
            queryKey: queryKeys.storage.data(this.labId),
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

      if (!this.labId) return true;

      await this.queryClient.invalidateQueries({
        queryKey: queryKeys.storage.data(this.labId),
      });

      const freshData = (await this.queryClient.fetchQuery({
        queryKey: queryKeys.storage.data(this.labId),
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

    if (eventCount > CONFIG_CHANGE_SUMMARY_THRESHOLD) {
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

  private setupSystemAdminEventHandlers(): void {
    if (!this.socket) return;

    this.registerHandler(
      'lab_data_changed',
      systemAdminEventSchemas.lab_data_changed,
      ({ labId }) => {
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.labs.overview() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.labs.list() });
      }
    );
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

let globalSocketBridge: SocketQueryBridge | null = null;

export const getSocketBridge = (
  queryClient: QueryClient,
  labId: string | undefined
): SocketQueryBridge => {
  if (!globalSocketBridge) {
    globalSocketBridge = new SocketQueryBridge(queryClient, labId);
  }
  return globalSocketBridge;
};

export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    globalSocketBridge = null;
  }
};
