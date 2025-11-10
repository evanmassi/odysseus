/**
 * Tube Socket Integration
 *
 * Socket.IO integration with React Query cache invalidation.
 *
 * - Bridges real-time updates with React Query cache
 * - Smart cache invalidation based on socket events
 * - Optimistic updates with server reconciliation
 * - Connection management with proper cleanup
 */

import { useEffect, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import { queryKeys } from '@app/queryKeys';

import type { TubeData } from '@domains/tubes/types';
import type { Socket } from 'socket.io-client';




/**
 * Socket connection manager hook
 * 
 * Manages socket connection and integrates with React Query cache
 */
export const useTubeSocket = () => {
  const queryClient = useQueryClient();

  // Socket connection management
  const initializeSocket = useCallback(() => {
    console.log('🔌 [Socket] Initializing socket connection');
    
    // Create socket connection
    const socket = io('http://localhost:3001');
    
    // CONNECTION EVENTS
    
    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      // Note: Connection notifications handled by SocketQueryBridge to avoid duplicates
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Disconnected from server:', reason);
      // Note: Disconnection notifications handled by SocketQueryBridge to avoid duplicates
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket] Connection error:', error);
      // Note: Connection error notifications handled by SocketQueryBridge to avoid duplicates
    });

    // TUBE DATA EVENTS

    /**
     * Handle tube creation events
     * 
     * Replaces: tubeStore socket handler for tube_created
     */
    socket.on('tube_created', ({ tube }: { tube: TubeData }) => {
      console.log('🔄 [Socket] Tube created event received:', tube.id);
      
      // Add to individual tube cache immediately
      queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
      
      // Add to existing list queries if they exist
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return undefined; // Don't create new data, just update existing
          
          // Check if tube already exists (avoid duplicates)
          const exists = oldData.some(existingTube => existingTube.id === tube.id);
          if (exists) {
            console.log('⚠️ [Socket] Tube already exists in cache, skipping add');
            return oldData;
          }
          
          console.log('[Socket] Adding new tube to cache');
          return [...oldData, tube];
        }
      );
      
      // Update location-specific queries
      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        queryClient.setQueryData(
          queryKeys.tubes.location(tube.location.tankId, tube.location.rackId, tube.location.boxId),
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;
            
            const exists = oldData.some(existingTube => existingTube.id === tube.id);
            if (!exists) {
              return [...oldData, tube];
            }
            return oldData;
          }
        );
      }

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    });

    /**
     * Handle tube update events
     * 
     * Replaces: tubeStore socket handler for tube_updated
     */
    socket.on('tube_updated', ({ tube }: { tube: TubeData }) => {
      console.log('🔄 [Socket] Tube updated event received:', tube.id);
      
      // Update individual tube cache
      queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
      
      // Update in all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return undefined;
          
          return oldData.map(existingTube => 
            existingTube.id === tube.id ? tube : existingTube
          );
        }
      );
      
      // Update location-specific queries
      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        queryClient.setQueryData(
          queryKeys.tubes.location(tube.location.tankId, tube.location.rackId, tube.location.boxId),
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return undefined;
            
            return oldData.map(existingTube => 
              existingTube.id === tube.id ? tube : existingTube
            );
          }
        );
      }

      // Invalidate statistics (tube properties might have changed)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });

      console.log('[Socket] Tube update applied to cache');
    });

    /**
     * Handle tube deletion events
     * 
     * Replaces: tubeStore socket handler for tube_deleted
     */
    socket.on('tube_deleted', ({ tubeId }: { tubeId: string }) => {
      console.log('🔄 [Socket] Tube deleted event received:', tubeId);
      
      // Remove from individual tube cache
      queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });
      
      // Remove from all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return undefined;
          
          return oldData.filter(tube => tube.id !== tubeId);
        }
      );
      
      // Remove from location queries (we don't know which location, so invalidate all)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.lists(),
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key[0] === 'tubes' && key[1] === 'list' && key[2] === 'location';
        }
      });

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      
      console.log('[Socket] Tube deletion applied to cache');
    });

    /**
     * Handle bulk tube update events
     * 
     * Replaces: tubeStore socket handler for tubes_bulk_updated
     */
    socket.on('tubes_bulk_updated', ({ tubes }: { tubes: TubeData[] }) => {
      console.log(`🔄 [Socket] Bulk update event received: ${tubes.length} tubes`);
      
      tubes.forEach(tube => {
        // Update individual tube caches
        queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
      });
      
      // Update all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return undefined;
          
          const updatedData = [...oldData];
          
          tubes.forEach(updatedTube => {
            const index = updatedData.findIndex(tube => tube.id === updatedTube.id);
            if (index !== -1) {
              updatedData[index] = updatedTube;
            }
          });
          
          return updatedData;
        }
      );
      
      // Invalidate location queries and statistics (bulk updates might affect multiple locations)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.lists(),
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key[0] === 'tubes' && key[1] === 'list' && key[2] === 'location';
        }
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
      
      console.log('[Socket] Bulk update applied to cache');
    });

    // RESEARCHER EVENTS (if needed)
    
    socket.on('researcher_updated', () => {
      console.log('🔄 [Socket] Researcher data updated, invalidating related queries');

      // Invalidate researcher queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

      // Invalidate tube statistics (researcher data affects stats)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    });

    // CONNECTION RECOVERY
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 [Socket] Reconnected after ${attemptNumber} attempts`);

      // Invalidate all queries to refetch fresh data after reconnection
      void queryClient.invalidateQueries();

      // Note: Reconnection notifications handled by SocketQueryBridge to avoid duplicates
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ [Socket] Failed to reconnect to server');
      // Note: Reconnection failure notifications handled by SocketQueryBridge to avoid duplicates
    });

    // Store socket in a way that can be accessed for cleanup
    (window as any).__odysseusSocket = socket;
    
    return socket;
  }, [queryClient]);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    console.log('🔌 [Socket] Disconnecting socket');
    
    const socket = (window as any).__odysseusSocket as Socket;
    if (socket) {
      socket.disconnect();
      delete (window as any).__odysseusSocket;
    }
  }, []);

  // Get current socket
  const getSocket = useCallback(() => {
    return (window as any).__odysseusSocket as Socket | null;
  }, []);

  // Get connection status
  const isConnected = useCallback(() => {
    const socket = getSocket();
    return socket?.connected ?? false;
  }, [getSocket]);

  return {
    initializeSocket,
    disconnectSocket,
    getSocket,
    isConnected
  };
};

/**
 * Auto-initializing socket hook
 * 
 * Automatically manages socket lifecycle in components
 */
export const useAutoSocket = () => {
  const { initializeSocket, disconnectSocket, isConnected } = useTubeSocket();

  useEffect(() => {
    // Initialize socket on mount
    initializeSocket();

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [initializeSocket, disconnectSocket]);

  return {
    isConnected: isConnected()
  };
};

/**
 * Socket-aware query hook
 * 
 * Provides real-time data with socket integration
 */
export const useRealtimeTubes = (
  filters: {
    tankId?: string;
    rackId?: number;
    boxId?: string;
  } = {}
) => {
  const queryClient = useQueryClient();
  const { initializeSocket } = useTubeSocket();

  useEffect(() => {
    // Ensure socket is connected for real-time updates
    initializeSocket();
  }, [initializeSocket]);

  // Return the query key for manual invalidation if needed
  return {
    queryKey: queryKeys.tubes.list(filters),
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.list(filters) });
    }
  };
};
