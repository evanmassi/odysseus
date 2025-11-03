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

// Query key patterns for different domains
export const queryKeys = {
  tubes: {
    all: ['tubes'] as const,
    lists: () => [...queryKeys.tubes.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.tubes.lists(), { ...filters }] as const,
    location: (tankId: string, rackId: string, boxId: string) =>
      [...queryKeys.tubes.lists(), 'location', { tankId, rackId, boxId }] as const,
    detail: (id: string) => [...queryKeys.tubes.all, 'detail', id] as const,
    stats: () => [...queryKeys.tubes.all, 'stats'] as const,
  },
  researchers: {
    all: ['researchers'] as const,
    lists: () => [...queryKeys.researchers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.researchers.all, 'detail', id] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.search.all, 'results', query, { ...filters }] as const,
  }
} as const;

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
    this.setupReconnectionHandlers();

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
      notifications.success('Connected to server');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      notifications.error('Disconnected from server');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [SocketBridge] Connection error:', error);
      notifications.error('Failed to connect to server');
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

  // RECONNECTION HANDLERS

  private setupReconnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('reconnect', (attemptNumber: number) => {
      // Invalidate all queries to refetch fresh data
      this.queryClient.invalidateQueries();

      notifications.success('Reconnected to server - data refreshed');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ [SocketBridge] Failed to reconnect to server');
      notifications.error('Failed to reconnect to server');
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
 * Cleanup global socket bridge
 */
export const cleanupSocketBridge = (): void => {
  if (globalSocketBridge) {
    globalSocketBridge.disconnect();
    globalSocketBridge = null;
  }
};
