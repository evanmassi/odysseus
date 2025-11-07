/**
 * Socket → Query Cache Bridge
 * Phase 3: Socket Integration and Real-time Updates
 * 
 * Centralized bridge between Socket.IO events and React Query cache.
 * Replaces domain-specific socket handlers with unified cache management.
 * 
 * Architecture:
 * - Event-driven cache invalidation
 * - Type-safe socket event handling
 * - Domain-agnostic real-time updates
 * - Optimistic update reconciliation
 * - Connection lifecycle management
 */

import { QueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { z } from 'zod';
import { websocketMessageSchema, tubeDataSchema, type TubeData, type Researcher } from '@odysseus/shared-schemas';
import { notifications } from '@shared/utils/notifications';
import { queryKeys } from '@app/queryKeys';

// Re-export queryKeys from centralized location
export { queryKeys } from '@app/queryKeys';

/**
 * Socket event schemas for type safety
 * Nested structure matching shared schemas
 */
const tubeEventSchemas = {
  tube_created: z.object({
    tube: z.object({
      id: z.string(),
      location: z.object({
        tankId: z.string(),
        rackId: z.string(),
        boxId: z.string(),
        position: z.number()
      }),
      // Add other required fields as needed
    }).passthrough()
  }),
  
  tube_updated: z.object({
    tube: z.object({
      id: z.string(),
      location: z.object({
        tankId: z.string(),
        rackId: z.string(),
        boxId: z.string(),
        position: z.number()
      })
    }).passthrough()
  }),
  
  tube_deleted: z.object({
    tubeId: z.string()
  }),
  
  tubes_bulk_updated: z.object({
    tubes: z.array(tubeDataSchema),
    count: z.number()
  })
} as const;

const researcherEventSchemas = {
  researcher_created: z.object({
    researcher: z.object({
      id: z.string(),
      name: z.string()
    }).passthrough()
  }),

  researcher_updated: z.object({
    researcher: z.object({
      id: z.string(),
      name: z.string()
    }).passthrough()
  }),

  researcher_deleted: z.object({
    researcherId: z.string()
  })
} as const;

const configurationEventSchemas = {
  configuration_updated: z.object({
    eventTypes: z.array(z.string()),
    eventCount: z.number(),
    updatedAt: z.string(),
    changedBy: z.string(),
  })
} as const;

/**
 * Socket → Query Cache Bridge
 * 
 * Centralizes all socket event handling and cache management
 */
export class SocketQueryBridge {
  private socket: Socket | null = null;
  private queryClient: QueryClient;
  private isConnected = false;
  private isInitialized = false;

  // Track last known configuration version to prevent unnecessary invalidations
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
      console.warn('⚠️ [SocketBridge] Already initialized, skipping duplicate initialization');
      return;
    }

    this.socket = socket;
    this.setupConnectionHandlers();
    this.setupTubeEventHandlers();
    this.setupResearcherEventHandlers();
    this.setupConfigurationEventHandlers();
    this.setupReconnectionHandlers();
    this.setupOnlineOfflineHandlers();

    this.isInitialized = true;
  }

  /**
   * Disconnect socket and cleanup handlers
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isInitialized = false;
    }

    // Cleanup online/offline listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  // Bound handlers for cleanup
  private handleOnline = () => {
    console.log('🌐 [SocketBridge] Browser back online');
    this.queryClient.invalidateQueries({
      queryKey: queryKeys.storage.storage()
    });
    notifications.info('Connection restored - syncing latest data');
  };

  private handleOffline = () => {
    console.log('📴 [SocketBridge] Browser went offline');
    notifications.warning('No internet connection - working in offline mode');
  };

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
      console.log('✅ [SocketBridge] Connected to server', {
        socketId: this.socket?.id,
        timestamp: new Date().toISOString()
      });
      notifications.success('Connected to server');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      console.warn('⚠️ [SocketBridge] Disconnected from server', {
        reason,
        timestamp: new Date().toISOString()
      });

      // Only show notification for unexpected disconnections
      if (reason !== 'io client disconnect') {
        notifications.error('Disconnected from server');
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [SocketBridge] Connection error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Don't spam notifications on repeated connection errors
      if (!this.isConnected) {
        notifications.error('Failed to connect to server');
      }
    });
  }

  // TUBE EVENT HANDLERS

  private setupTubeEventHandlers(): void {
    if (!this.socket) return;

    // Tube Created
    this.socket.on('tube_created', (data: unknown) => {
      try {
        const { tube } = tubeEventSchemas.tube_created.parse(data);

        // Add to individual tube cache
        this.queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
        
        // Add to list queries if they exist (don't create new data)
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.lists() },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;

            const exists = oldData.some((item: TubeData) => item.id === tube.id);
            if (exists) return oldData;

            return [...oldData, tube];
          }
        );

        // Update location-specific queries (nested structure)
        if (tube.location?.tankId && tube.location?.rackId && tube.location?.boxId) {
          this.queryClient.setQueryData(
            queryKeys.tubes.location(tube.location.tankId, tube.location.rackId, tube.location.boxId),
            (oldData: TubeData[] | undefined) => {
              if (!oldData) return undefined;
              const exists = oldData.some((item: TubeData) => item.id === tube.id);
              return exists ? oldData : [...oldData, tube];
            }
          );
        }
        
        // Invalidate statistics
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid tube_created event:', error);
      }
    });

    // Tube Updated
    this.socket.on('tube_updated', (data: unknown) => {
      try {
        const { tube } = tubeEventSchemas.tube_updated.parse(data);

        // Update individual tube cache
        this.queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);

        // Update in all list queries
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.lists() },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;
            return oldData.map((item: TubeData) => item.id === tube.id ? tube : item);
          }
        );

        // Update location-specific queries (nested structure)
        if (tube.location?.tankId && tube.location?.rackId && tube.location?.boxId) {
          this.queryClient.setQueryData(
            queryKeys.tubes.location(tube.location.tankId, tube.location.rackId, tube.location.boxId),
            (oldData: TubeData[] | undefined) => {
              if (!oldData) return undefined;
              return oldData.map((item: TubeData) => item.id === tube.id ? tube : item);
            }
          );
        }
        
        // Invalidate statistics
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid tube_updated event:', error);
      }
    });

    // Tube Deleted
    this.socket.on('tube_deleted', (data: unknown) => {
      try {
        const { tubeId } = tubeEventSchemas.tube_deleted.parse(data);

        // Remove from individual cache
        this.queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });

        // Remove from all list queries
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.lists() },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;
            return oldData.filter((item: TubeData) => item.id !== tubeId);
          }
        );
        
        // Invalidate location queries (we don't know which location)
        this.queryClient.invalidateQueries({ 
          queryKey: queryKeys.tubes.lists(),
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key.includes('location');
          }
        });
        
        // Invalidate statistics
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid tube_deleted event:', error);
      }
    });

    // Bulk Tube Updates
    this.socket.on('tubes_bulk_updated', (data: unknown) => {
      try {
        const { tubes } = tubeEventSchemas.tubes_bulk_updated.parse(data);

        // Update individual caches
        tubes.forEach(tube => {
          this.queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
        });

        // Update all list queries
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.lists() },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;

            let updatedData = [...oldData];
            tubes.forEach(updatedTube => {
              const index = updatedData.findIndex((item: TubeData) => item.id === updatedTube.id);
              if (index !== -1) {
                updatedData[index] = updatedTube;
              }
            });
            return updatedData;
          }
        );
        
        // Invalidate location and stats queries
        this.queryClient.invalidateQueries({ 
          queryKey: queryKeys.tubes.lists(),
          predicate: (query) => {
            const key = query.queryKey as string[];
            return key.includes('location');
          }
        });
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid tubes_bulk_updated event:', error);
      }
    });
  }

  // RESEARCHER EVENT HANDLERS  

  private setupResearcherEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('researcher_created', (data: unknown) => {
      try {
        const { researcher } = researcherEventSchemas.researcher_created.parse(data);

        // Add to researcher caches
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.researchers.lists() },
          (oldData: Researcher[] | undefined) => {
            if (!oldData) return undefined;
            const exists = oldData.some((item: Researcher) => item.id === researcher.id);
            return exists ? oldData : [...oldData, researcher];
          }
        );
        
        // Invalidate tube statistics (researcher affects stats)
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid researcher_created event:', error);
      }
    });

    this.socket.on('researcher_updated', (data: unknown) => {
      try {
        const { researcher } = researcherEventSchemas.researcher_updated.parse(data);

        // Update researcher caches
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.researchers.lists() },
          (oldData: Researcher[] | undefined) => {
            if (!oldData) return undefined;
            return oldData.map((item: Researcher) => item.id === researcher.id ? researcher : item);
          }
        );
        
        // Invalidate tube statistics
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid researcher_updated event:', error);
      }
    });

    this.socket.on('researcher_deleted', (data: unknown) => {
      try {
        const { researcherId } = researcherEventSchemas.researcher_deleted.parse(data);

        // Remove from researcher caches
        this.queryClient.setQueriesData(
          { queryKey: queryKeys.researchers.lists() },
          (oldData: Researcher[] | undefined) => {
            if (!oldData) return undefined;
            return oldData.filter((item: Researcher) => item.id !== researcherId);
          }
        );
        
        // Invalidate tube statistics
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
        
      } catch (error) {
        console.error('❌ [SocketBridge] Invalid researcher_deleted event:', error);
      }
    });
  }

  // CONFIGURATION EVENT HANDLERS

  private setupConfigurationEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('configuration_updated', async (data: unknown) => {
      try {
        const { eventTypes, eventCount, updatedAt, changedBy } = configurationEventSchemas.configuration_updated.parse(data);

        console.log(
          `🔔 [SocketBridge] Configuration updated event received`,
          { eventTypes, eventCount, updatedAt, changedBy }
        );

        // Check if version actually changed before notifying user
        const versionChanged = await this.invalidateConfigurationIfChanged();

        if (versionChanged) {
          // Generate context-aware notification message
          const message = this.generateConfigurationUpdateMessage(eventTypes, eventCount);
          notifications.info(message);
        } else {
          console.log('⚠️ [SocketBridge] Configuration version unchanged, skipping notification');
        }

      } catch (error) {
        // Log detailed error information for debugging
        console.error('❌ [SocketBridge] Error handling configuration_updated event:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          receivedData: data,
          timestamp: new Date().toISOString()
        });

        // Graceful degradation: invalidate cache anyway to ensure data consistency
        try {
          await this.queryClient.invalidateQueries({
            queryKey: queryKeys.storage.storage()
          });
          console.log('✅ [SocketBridge] Fallback: Successfully invalidated configuration cache');
        } catch (fallbackError) {
          console.error('❌ [SocketBridge] Critical: Failed to invalidate cache in error handler:', fallbackError);
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
      // Get currently cached configuration
      const cachedConfig = this.queryClient.getQueryData(
        queryKeys.storage.storage()
      ) as any; // ConfigurationResponse type

      const currentVersion = cachedConfig?.configuration?.systemConfig?.version;

      // Invalidate cache and refetch
      await this.queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage()
      });

      // Wait for refetch to complete
      await this.queryClient.refetchQueries({
        queryKey: queryKeys.storage.storage()
      });

      // Get the new configuration
      const newConfig = this.queryClient.getQueryData(
        queryKeys.storage.storage()
      ) as any;

      const newVersion = newConfig?.configuration?.systemConfig?.version;

      // Check if version actually changed
      if (currentVersion !== undefined && newVersion !== undefined) {
        const versionChanged = currentVersion !== newVersion;

        // Detect database reset (version went backward)
        if (newVersion < currentVersion) {
          console.warn('⚠️ [SocketBridge] Database reset detected!', {
            previous: currentVersion,
            current: newVersion,
            difference: currentVersion - newVersion
          });

          // Show warning notification to user
          notifications.warning(
            'Database was reset. Your local settings have been synchronized with the server.'
          );

          // Clear all localStorage to prevent stale data issues
          try {
            localStorage.removeItem('odysseus-configuration-store');
            console.log('🗑️  [SocketBridge] Cleared localStorage after database reset');
          } catch (clearError) {
            console.error('❌ [SocketBridge] Failed to clear localStorage:', clearError);
          }
        }

        console.log('📊 [SocketBridge] Version check:', {
          previous: currentVersion,
          current: newVersion,
          changed: versionChanged,
          direction: newVersion > currentVersion ? 'forward' : newVersion < currentVersion ? 'backward' : 'unchanged'
        });

        this.lastKnownConfigVersion = newVersion;
        return versionChanged;
      }

      // If we can't determine versions, assume it changed to be safe
      return true;

    } catch (error) {
      console.error('❌ [SocketBridge] Error checking configuration version:', error);
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

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 [SocketBridge] Reconnected after ${attemptNumber} attempts`);

      // Invalidate all queries to refetch fresh data after reconnection
      this.queryClient.invalidateQueries();

      notifications.success('Reconnected to server - data refreshed');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 [SocketBridge] Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ [SocketBridge] Failed to reconnect to server after all attempts');
      notifications.error('Failed to reconnect to server. Please refresh the page.');
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('❌ [SocketBridge] Reconnection error:', error);
    });
  }

  /**
   * Handle online/offline transitions
   * Note: React Query automatically handles offline mode by default.
   * When offline: queries don't refetch, mutations queue up
   * When back online: queries automatically retry, mutations execute
   */
  private setupOnlineOfflineHandlers(): void {
    // Remove existing listeners first (idempotent - prevents duplicates)
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    // Then add fresh ones
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
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
 * Cleanup global socket bridge
 */
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    globalSocketBridge = null;
  }
};
