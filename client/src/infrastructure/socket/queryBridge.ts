/**
 * Socket → Query Cache Bridge
 *
 * Centralized bridge between Socket.IO events and React Query cache.
 * Handles real-time synchronization across multiple connected clients.
 *
 * Architecture:
 * - Event-driven cache invalidation
 * - Type-safe socket event handling via Zod schemas
 * - Domain-agnostic real-time updates
 * - Connection lifecycle management with reconnection handling
 */

import { z } from 'zod';

import { queryKeys } from '@app/cache/queryKeys';
import { getNetworkMonitor } from '@infra/connection/networkMonitor';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';
import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

// Re-export queryKeys from centralized location
export { queryKeys } from '@app/cache/queryKeys';

/**
 * Socket event schemas for type safety
 * Nested structure matching shared schemas
 */
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

  // Tube lock events
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

// Researcher event schema - shared structure for all researcher change events
const researcherEventSchema = z.object({
  researcherId: z.string(),
  eventType: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
  // Optional fields only present on researcher_created
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
  // Response to explicit request_presence - used for reliable initial state
  presence_state: z.object({
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
} as const;

/**
 * Socket → Query Cache Bridge
 *
 * Centralizes all socket event handling and cache management.
 * Singleton pattern - one instance per app lifetime.
 */
export class SocketQueryBridge {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isConnected = false;
  private isInitialized = false;

  // Session state: Persists across socket reconnections
  private lastKnownConfigVersion: number | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Initialize socket connection and event handlers
   * Prevents duplicate event handler registration
   */
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

  /**
   * Disconnect socket and cleanup connection state
   *
   * Preserves session state (version tracking) across reconnections.
   * Only clears connection-specific state (socket, listeners).
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isInitialized = false;
      // Note: lastKnownConfigVersion intentionally preserved (session state)
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && (this.socket?.connected ?? false);
  }

  // CONNECTION EVENT HANDLERS

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;

      // Initialize version tracking from current cache (if not already set)
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

      // Request current presence state after connection is established
      // This is more reliable than catching user_online broadcast during connection
      this.socket?.emit('request_presence');

      // Notify NetworkMonitor of socket connection
      getNetworkMonitor()?.notifySocketConnected();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      logger.warn('Socket disconnected', { reason, timestamp: new Date().toISOString() });

      // Notify NetworkMonitor of socket disconnection
      // NetworkMonitor handles all user-facing notifications
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
      // NetworkMonitor handles connection status - no notification here
    });
  }

  // TUBE EVENT HANDLERS

  private setupTubeEventHandlers(): void {
    if (!this.socket) return;

    // Tube Created - invalidate queries to fetch fresh data
    this.socket.on('tube_created', (data: unknown) => {
      try {
        const { location } = tubeEventSchemas.tube_created.parse(data);

        // Invalidate location-specific query where tube was created
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
        });

        // Invalidate global lists query (used by TubeEditorModal position analysis)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });

        // Invalidate statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_created event', { error });
      }
    });

    // Tube Updated - invalidate queries to fetch fresh data
    this.socket.on('tube_updated', (data: unknown) => {
      try {
        const { tubeId, oldLocation, newLocation } = tubeEventSchemas.tube_updated.parse(data);

        // Invalidate the specific tube detail
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.detail(tubeId),
        });

        // Invalidate old location query
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            oldLocation.tankId,
            oldLocation.rackId,
            oldLocation.boxId
          ),
        });

        // Invalidate new location query (if different)
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

        // Invalidate global lists query (used by TubeEditorModal position analysis)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });

        // Invalidate statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_updated event', { error });
      }
    });

    // Tube Deleted - invalidate queries to reflect deletion
    this.socket.on('tube_deleted', (data: unknown) => {
      try {
        const { tubeId, location } = tubeEventSchemas.tube_deleted.parse(data);

        // Remove from individual cache
        this.queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });

        // Invalidate location query where tube was deleted
        void this.queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
        });

        // Invalidate global lists query (used by TubeEditorModal position analysis)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll() });

        // Invalidate statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid tube_deleted event', { error });
      }
    });

    // Bulk Tube Updates - invalidate all tube queries
    this.socket.on('tubes_bulk_updated', (data: unknown) => {
      try {
        tubeEventSchemas.tubes_bulk_updated.parse(data);

        // Invalidate all tube queries since bulk operations may affect multiple locations
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      } catch (error) {
        logger.error('Invalid tubes_bulk_updated event', { error });
      }
    });
  }

  // TUBE LOCK EVENT HANDLERS

  /**
   * Setup handlers for tube lock/unlock/share events.
   * Uses smart cache updates instead of broad invalidation for better performance.
   * Patches lock/share state directly in cached queries - no network requests needed.
   */
  private setupTubeLockEventHandlers(): void {
    if (!this.socket) return;

    // Tubes Locked - patch lock state directly in cache
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

    // Tubes Unlocked - patch lock state directly in cache
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

    // Tube Access Shared - patch sharedWithUserIds directly in cache
    this.socket.on('tube_access_shared', (data: unknown) => {
      try {
        const { tubeSharedUsers } = tubeEventSchemas.tube_access_shared.parse(data);

        // Create lookup map for efficient access
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

    // Tube Access Revoked - patch sharedWithUserIds directly in cache
    this.socket.on('tube_access_revoked', (data: unknown) => {
      try {
        const { tubeSharedUsers } = tubeEventSchemas.tube_access_revoked.parse(data);

        // Create lookup map for efficient access
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

  /**
   * Patch specific tubes in all cached queries.
   * Updates tube data in-place without network requests.
   */
  private patchTubesInCache(tubeIds: string[], patchFn: (tube: TubeData) => TubeData): void {
    const tubeIdSet = new Set(tubeIds);

    // Update tubes in all tube queries (lists, locations, details)
    this.queryClient.setQueriesData<TubeData[] | TubeData | undefined>(
      { queryKey: queryKeys.tubes.all },
      oldData => {
        if (!oldData) return oldData;

        // Handle array of tubes (list/location queries)
        if (Array.isArray(oldData)) {
          return oldData.map(tube => (tubeIdSet.has(tube.id) ? patchFn(tube) : tube));
        }

        // Handle single tube (detail query)
        if (typeof oldData === 'object' && 'id' in oldData && tubeIdSet.has(oldData.id)) {
          return patchFn(oldData);
        }

        return oldData;
      }
    );
  }

  // RESEARCHER EVENT HANDLERS

  private setupResearcherEventHandlers(): void {
    if (!this.socket) return;

    // Researcher Created - invalidate queries to fetch fresh data
    this.socket.on('researcher_created', (data: unknown) => {
      try {
        researcherEventSchemas.researcher_created.parse(data);

        // Invalidate researcher queries to fetch fresh list
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

        // Invalidate tube statistics (researcher affects stats)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid researcher_created event', { error });
      }
    });

    // Researcher Updated - invalidate queries to fetch fresh data
    this.socket.on('researcher_updated', (data: unknown) => {
      try {
        researcherEventSchemas.researcher_updated.parse(data);

        // Invalidate researcher queries
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

        // Invalidate tube statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid researcher_updated event', { error });
      }
    });

    // Researcher Deactivated - invalidate queries to fetch fresh data
    this.socket.on('researcher_deactivated', (data: unknown) => {
      try {
        researcherEventSchemas.researcher_deactivated.parse(data);

        // Invalidate researcher queries
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

        // Invalidate tube statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid researcher_deactivated event', { error });
      }
    });

    // Researcher Reactivated - invalidate queries to fetch fresh data
    this.socket.on('researcher_reactivated', (data: unknown) => {
      try {
        researcherEventSchemas.researcher_reactivated.parse(data);

        // Invalidate researcher queries
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

        // Invalidate tube statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid researcher_reactivated event', { error });
      }
    });

    // Researcher Deleted - invalidate queries so deleted researcher is removed from dropdowns
    this.socket.on('researcher_deleted', (data: unknown) => {
      try {
        researcherEventSchemas.researcher_deleted.parse(data);

        // Invalidate researcher queries
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

        // Invalidate tube statistics
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      } catch (error) {
        logger.error('Invalid researcher_deleted event', { error });
      }
    });
  }

  // USER EVENT HANDLERS

  private setupUserEventHandlers(): void {
    if (!this.socket) return;

    // User Approved - invalidate user list queries so approved user appears in dropdowns
    this.socket.on('user_approved', (data: unknown) => {
      try {
        userEventSchemas.user_approved.parse(data);

        // Invalidate user list queries (used by dropdowns in StorageManagerModal, etc.)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });

        // Also invalidate admin users query
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      } catch (error) {
        logger.error('Invalid user_approved event', { error });
      }
    });

    // User Deleted - invalidate user list queries so deleted user is removed from dropdowns
    this.socket.on('user_deleted', (data: unknown) => {
      try {
        userEventSchemas.user_deleted.parse(data);

        // Invalidate user list queries (used by dropdowns in StorageManagerModal, etc.)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });

        // Also invalidate admin users query
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      } catch (error) {
        logger.error('Invalid user_deleted event', { error });
      }
    });

    // User Role Changed - invalidate user queries so role change is reflected
    this.socket.on('user_role_changed', (data: unknown) => {
      try {
        userEventSchemas.user_role_changed.parse(data);

        // Invalidate user list and admin queries
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      } catch (error) {
        logger.error('Invalid user_role_changed event', { error });
      }
    });

    // User Created - invalidate admin queries so new pending user appears
    this.socket.on('user_created', (data: unknown) => {
      try {
        userEventSchemas.user_created.parse(data);

        // Invalidate admin users query (new user appears in pending list)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      } catch (error) {
        logger.error('Invalid user_created event', { error });
      }
    });

    // User Linked to Researcher - invalidate user and researcher queries
    this.socket.on('user_linked_to_researcher', (data: unknown) => {
      try {
        userEventSchemas.user_linked_to_researcher.parse(data);

        // Invalidate user queries (user now has researcher link)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });

        // Invalidate researcher queries (researcher now linked to user)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
      } catch (error) {
        logger.error('Invalid user_linked_to_researcher event', { error });
      }
    });

    // User Unlinked from Researcher - invalidate user and researcher queries
    this.socket.on('user_unlinked_from_researcher', (data: unknown) => {
      try {
        userEventSchemas.user_unlinked_from_researcher.parse(data);

        // Invalidate user queries (user no longer has researcher link)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });

        // Invalidate researcher queries (researcher no longer linked to user)
        void this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
      } catch (error) {
        logger.error('Invalid user_unlinked_from_researcher event', { error });
      }
    });
  }

  // PRESENCE EVENT HANDLERS

  /**
   * Setup handlers for user presence (online/offline) events.
   * Directly updates React Query cache with new online user list.
   */
  private setupPresenceEventHandlers(): void {
    if (!this.socket) return;

    // User came online - update presence cache with full online user list
    this.socket.on('user_online', (data: unknown) => {
      try {
        const { userId, onlineUserIds } = presenceEventSchemas.user_online.parse(data);

        // Directly set the cache with the authoritative list from server
        this.queryClient.setQueryData(queryKeys.users.presence(), onlineUserIds);

        // Check if the new user is in our cached user list
        // If not, invalidate the user list so we can display their badge
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

    // User went offline - update presence cache with full online user list
    this.socket.on('user_offline', (data: unknown) => {
      try {
        const { onlineUserIds } = presenceEventSchemas.user_offline.parse(data);

        // Directly set the cache with the authoritative list from server
        this.queryClient.setQueryData(queryKeys.users.presence(), onlineUserIds);
      } catch (error) {
        logger.error('Invalid user_offline event', { error });
      }
    });

    // Response to explicit presence request - provides authoritative initial state
    this.socket.on('presence_state', (data: unknown) => {
      try {
        const { onlineUserIds } = presenceEventSchemas.presence_state.parse(data);

        // Set the cache with authoritative list from server
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

        // Check if version actually changed before notifying user
        const versionChanged = await this.invalidateConfigurationIfChanged();

        if (versionChanged) {
          // Generate context-aware notification message
          const message = this.generateConfigurationUpdateMessage(eventTypes, eventCount);
          notifications.info(message);
        }
      } catch (error) {
        // Log detailed error information for debugging
        logger.error('Error handling configuration_updated event', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          receivedData: data,
          timestamp: new Date().toISOString(),
        });

        // Graceful degradation: invalidate cache anyway to ensure data consistency
        try {
          await this.queryClient.invalidateQueries({
            queryKey: queryKeys.storage.data(),
          });
        } catch (fallbackError) {
          logger.error('Critical: Failed to invalidate cache in error handler', { fallbackError });
          // Last resort: show user notification to refresh
          notifications.error('Configuration sync error. Please refresh the page.');
        }
      }
    });
  }

  /**
   * Invalidate configuration cache only if version has changed
   * Returns true if version changed, false otherwise
   * Detects database resets (version going backward)
   */
  private async invalidateConfigurationIfChanged(): Promise<boolean> {
    try {
      const currentVersion = this.lastKnownConfigVersion;

      // Invalidate cache first
      await this.queryClient.invalidateQueries({
        queryKey: queryKeys.storage.data(),
      });

      // Fetch fresh data from server (this waits for the network request to complete)
      const freshData = (await this.queryClient.fetchQuery({
        queryKey: queryKeys.storage.data(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Query result with unknown structure before validation
      })) as any;

      const newVersion = freshData?.configuration?.systemConfig?.version;

      // If this is the first time we're seeing a version, initialize tracking
      if (currentVersion === null && newVersion !== undefined) {
        this.lastKnownConfigVersion = newVersion;
        // On first event, always assume it changed (we have no baseline)
        return true;
      }

      // Check if version actually changed
      if (currentVersion !== undefined && currentVersion !== null && newVersion !== undefined) {
        const versionChanged = currentVersion !== newVersion;

        // Detect database reset (version went backward)
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

        // Update tracked version for next comparison
        this.lastKnownConfigVersion = newVersion;

        return versionChanged;
      }

      // If we can't determine versions, assume it changed to be safe
      return true;
    } catch (error) {
      logger.error('Error checking configuration version', { error });
      // On error, assume it changed to be safe
      return true;
    }
  }

  /**
   * Generate user-friendly notification message based on event types
   */
  private generateConfigurationUpdateMessage(eventTypes: string[], eventCount: number): string {
    // Single event type - be specific
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

    // Multiple events - show count if significant
    if (eventCount > 5) {
      return `${eventCount} configuration changes applied`;
    }

    // Multiple event types - be general but informative
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

  // RECONNECTION HANDLERS

  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('reconnect', () => {
      // Invalidate all queries to refetch fresh data after reconnection
      void this.queryClient.invalidateQueries();
      // Note: NetworkMonitor handles the "Connection restored" notification
    });

    this.socket.on('reconnect_attempt', () => {
      // Silent reconnection attempts
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to server after all attempts');
      notifications.error('Failed to reconnect to server. Please refresh the page.');
    });

    this.socket.on('reconnect_error', (error: Error) => {
      logger.error('Reconnection error', { error });
    });
  }
}

/**
 * Global socket bridge instance
 * Singleton pattern for consistent socket management
 */
let globalSocketBridge: SocketQueryBridge | null = null;

/**
 * Get or create global socket bridge instance
 */
export const getSocketBridge = (queryClient: QueryClient): SocketQueryBridge => {
  if (!globalSocketBridge) {
    globalSocketBridge = new SocketQueryBridge(queryClient);
  }
  return globalSocketBridge;
};

/**
 * Cleanup socket connection
 *
 * Disconnects the socket but preserves the singleton instance.
 * This maintains session state (version tracking) across reconnections.
 */
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    // Singleton preserved - only connection state cleared
  }
};
