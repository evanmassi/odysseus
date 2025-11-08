/**
 * Optimistic Updates Service
 * Phase 3 Step 3: Advanced optimistic updates with rollback and conflict resolution
 * 
 * Provides intelligent optimistic updates that feel instant while handling
 * network failures, conflicts, and edge cases gracefully.
 */

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { queryKeys } from '../socket/queryBridge';


import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';

/**
 * Optimistic update context for rollback
 */
export interface OptimisticContext<TData = any> {
  previousData: TData | undefined;
  tempId?: string;
  timestamp: number;
  userAction: string;
  rollbackQueries: string[][];
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  SERVER_WINS = 'server-wins',      // Server data always takes precedence
  CLIENT_WINS = 'client-wins',      // Client/user action takes precedence
  MERGE_SMART = 'merge-smart',      // Intelligent merging based on timestamps
  ASK_USER = 'ask-user'             // Show UI to let user decide
}

/**
 * Conflict information for resolution
 */
export interface DataConflict<T> {
  field: string;
  clientValue: T;
  serverValue: T;
  clientTimestamp: number;
  serverTimestamp: number;
}

/**
 * Optimistic mutation options
 */
export interface OptimisticMutationOptions<TData, TError, TVariables, TContext> 
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  
  // Optimistic update configuration
  optimisticUpdate?: {
    queryKeys: string[][];              // Queries to update optimistically
    updateFn: (variables: TVariables, oldData: any) => any;  // How to update the data
    generateTempId?: (variables: TVariables) => string;      // Generate temp ID for new items
    conflictResolution?: ConflictResolution;                 // How to handle conflicts
  };
  
  // User feedback configuration
  feedback?: {
    loading?: string;      // Message while mutation in progress
    success?: string;      // Message on success
    error?: string;        // Message on error
    rollback?: string;     // Message when rolling back
  };
}

/**
 * Optimistic Updates Service
 * 
 * Handles all optimistic update logic with proper rollback and conflict resolution
 */
export class OptimisticUpdatesService {
  private queryClient: QueryClient;
  private pendingMutations: Map<string, OptimisticContext> = new Map();
  private conflictQueue: Array<DataConflict<any>> = [];

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Create optimistic mutation with advanced rollback and conflict handling
   */
  public createOptimisticMutation<TData, TError, TVariables, TContext = OptimisticContext>(
    options: OptimisticMutationOptions<TData, TError, TVariables, TContext>
  ) {
    const { optimisticUpdate, feedback, ...mutationOptions } = options;

    return useMutation({
      ...mutationOptions,

      onMutate: async (variables: TVariables) => {
        // Run user's custom onMutate first
        let customContext;
        if (options.onMutate) {
          // TanStack Query v5: onMutate receives variables and mutation context
          customContext = await options.onMutate(variables, {} as any);
        }

        // Handle optimistic updates
        if (optimisticUpdate) {
          const context = await this.applyOptimisticUpdate(variables, optimisticUpdate);
          
          // Show loading feedback
          if (feedback?.loading) {
            toast.loading(feedback.loading, { id: context.tempId });
          }

          return { ...customContext, optimistic: context } as TContext;
        }

        return customContext;
      },

      onSuccess: (data: TData, variables: TVariables, context: any) => {
        // Handle optimistic success
        if (context?.optimistic) {
          const optimisticContext = context.optimistic as OptimisticContext;
          
          // Replace temp data with real server data
          this.replaceOptimisticData(optimisticContext, data);
          
          // Clear pending mutation
          if (optimisticContext.tempId) {
            this.pendingMutations.delete(optimisticContext.tempId);
          }

          // Show success feedback
          if (feedback?.success) {
            toast.success(feedback.success, { 
              id: optimisticContext.tempId 
            });
          } else {
            // Dismiss loading toast
            if (optimisticContext.tempId) {
              toast.dismiss(optimisticContext.tempId);
            }
          }
        }

        // Run user's custom onSuccess
        if (options.onSuccess) {
          // TanStack Query v5: onSuccess receives data, variables, context, and mutation
          options.onSuccess(data, variables, context, {} as any);
        }
      },

      onError: (error: TError, variables: TVariables, context: any) => {
        // Handle optimistic error - rollback
        if (context?.optimistic) {
          const optimisticContext = context.optimistic as OptimisticContext;
          
          console.error('❌ [OptimisticUpdates] Mutation failed, rolling back:', error);
          
          // Rollback optimistic changes
          this.rollbackOptimisticUpdate(optimisticContext);
          
          // Clear pending mutation
          if (optimisticContext.tempId) {
            this.pendingMutations.delete(optimisticContext.tempId);
          }

          // Show error feedback
          const errorMessage = feedback?.error || 'Action failed. Changes have been reverted.';
          toast.error(errorMessage, { 
            id: optimisticContext.tempId,
            duration: 5000
          });
        }

        // Run user's custom onError
        if (options.onError) {
          // TanStack Query v5: onError receives error, variables, context, and mutation
          options.onError(error, variables, context, {} as any);
        }
      },

      onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context: any) => {
        // Always invalidate affected queries to ensure consistency
        if (context?.optimistic) {
          const optimisticContext = context.optimistic as OptimisticContext;
          
          // Invalidate all affected queries
          optimisticContext.rollbackQueries.forEach(queryKey => {
            void this.queryClient.invalidateQueries({ queryKey });
          });
        }

        // Run user's custom onSettled
        if (options.onSettled) {
          // TanStack Query v5: onSettled receives data, error, variables, context, and mutation
          options.onSettled(data, error, variables, context, {} as any);
        }
      }
    });
  }

  /**
   * Apply optimistic update to cache
   */
  private async applyOptimisticUpdate<TVariables>(
    variables: TVariables,
    config: NonNullable<OptimisticMutationOptions<any, any, TVariables, any>['optimisticUpdate']>
  ): Promise<OptimisticContext> {
    const { queryKeys, updateFn, generateTempId, conflictResolution } = config;
    
    // Cancel any outgoing refetches for affected queries
    await Promise.all(
      queryKeys.map(queryKey => 
        this.queryClient.cancelQueries({ queryKey })
      )
    );

    // Generate temp ID if needed
    const tempId = generateTempId ? generateTempId(variables) : `temp-${Date.now()}-${Math.random()}`;

    // Snapshot current data for rollback
    const previousData: any = {};
    const rollbackQueries: string[][] = [];

    // Apply optimistic updates to each query
    for (const queryKey of queryKeys) {
      const currentData = this.queryClient.getQueryData(queryKey);
      previousData[JSON.stringify(queryKey)] = currentData;
      rollbackQueries.push(queryKey);

      // Apply optimistic update
      const newData = updateFn(variables, currentData);
      this.queryClient.setQueryData(queryKey, newData);
    }

    const context: OptimisticContext = {
      previousData,
      tempId,
      timestamp: Date.now(),
      userAction: JSON.stringify(variables),
      rollbackQueries
    };

    // Track pending mutation
    this.pendingMutations.set(tempId, context);

    return context;
  }

  /**
   * Replace optimistic data with real server data
   */
  private replaceOptimisticData(context: OptimisticContext, serverData: any): void {
    // Update queries with server data
    context.rollbackQueries.forEach(queryKey => {
      const currentData = this.queryClient.getQueryData(queryKey);
      
      if (Array.isArray(currentData)) {
        // For arrays, replace temp items with server data
        const newData = currentData.map(item => {
          if (item.id === context.tempId || (typeof item.id === 'string' && item.id.startsWith('temp-'))) {
            return { ...serverData, id: serverData.id };
          }
          return item;
        });
        
        this.queryClient.setQueryData(queryKey, newData);
      } else if (currentData && typeof currentData === 'object') {
        // For objects, merge server data
        this.queryClient.setQueryData(queryKey, {
          ...currentData,
          ...serverData
        });
      }
    });
  }

  /**
   * Rollback optimistic update
   */
  private rollbackOptimisticUpdate(context: OptimisticContext): void {
    // Restore previous data for each affected query
    context.rollbackQueries.forEach(queryKey => {
      const keyStr = JSON.stringify(queryKey);
      const previousData = context.previousData[keyStr];

      if (previousData !== undefined) {
        this.queryClient.setQueryData(queryKey, previousData);
      }
    });
  }

  /**
   * Handle conflicts between optimistic and server data
   */
  public async resolveConflict<T>(
    conflict: DataConflict<T>,
    resolution: ConflictResolution = ConflictResolution.SERVER_WINS
  ): Promise<T> {
    switch (resolution) {
      case ConflictResolution.SERVER_WINS:
        return conflict.serverValue;
        
      case ConflictResolution.CLIENT_WINS:
        return conflict.clientValue;
        
      case ConflictResolution.MERGE_SMART:
        // Use most recent timestamp
        return conflict.clientTimestamp > conflict.serverTimestamp 
          ? conflict.clientValue 
          : conflict.serverValue;
          
      case ConflictResolution.ASK_USER:
        // This would show a modal/dialog for user to choose
        return this.showConflictResolutionUI(conflict);
        
      default:
        return conflict.serverValue;
    }
  }

  /**
   * Show conflict resolution UI to user
   */
  private async showConflictResolutionUI<T>(conflict: DataConflict<T>): Promise<T> {
    // This would integrate with your modal system
    // For now, default to server wins
    console.warn('⚠️ [OptimisticUpdates] User conflict resolution UI not implemented, defaulting to server');
    return conflict.serverValue;
  }

  /**
   * Get pending mutations count
   */
  public getPendingMutationsCount(): number {
    return this.pendingMutations.size;
  }

  /**
   * Get all pending mutations
   */
  public getPendingMutations(): OptimisticContext[] {
    return Array.from(this.pendingMutations.values());
  }

  /**
   * Cancel all pending optimistic updates (emergency rollback)
   */
  public cancelAllOptimisticUpdates(): void {
    console.warn('🚨 [OptimisticUpdates] Emergency rollback - cancelling all optimistic updates');
    
    Array.from(this.pendingMutations.values()).forEach(context => {
      this.rollbackOptimisticUpdate(context);
    });
    
    this.pendingMutations.clear();
    
    toast.error('Connection issues detected. All pending changes have been reverted.', {
      duration: 5000,
      position: 'bottom-right'
    });
  }
}

/**
 * Pre-configured optimistic update patterns for common operations
 */
export const OptimisticPatterns = {
  /**
   * Create item pattern
   */
  createItem: <T extends { id: string }>(
    queryKey: string[],
    listPath?: string
  ) => ({
    queryKeys: [queryKey],
    updateFn: (variables: Partial<T>, oldData: T[] | undefined) => {
      if (!oldData) return [variables];
      return [...oldData, { ...variables, id: `temp-${Date.now()}` }];
    },
    generateTempId: () => `temp-${Date.now()}-${Math.random()}`,
    conflictResolution: ConflictResolution.SERVER_WINS
  }),

  /**
   * Update item pattern
   */
  updateItem: <T extends { id: string }>(
    queryKey: string[],
    itemId: string
  ) => ({
    queryKeys: [queryKey],
    updateFn: (variables: Partial<T>, oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item.id === itemId ? { ...item, ...variables } : item
      );
    },
    conflictResolution: ConflictResolution.MERGE_SMART
  }),

  /**
   * Delete item pattern
   */
  deleteItem: <T extends { id: string }>(
    queryKey: string[],
    itemId: string
  ) => ({
    queryKeys: [queryKey],
    updateFn: (variables: any, oldData: T[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.filter(item => item.id !== itemId);
    },
    conflictResolution: ConflictResolution.CLIENT_WINS
  })
};

/**
 * Global optimistic updates service
 */
let globalOptimisticService: OptimisticUpdatesService | null = null;

/**
 * Initialize global optimistic updates service
 */
export const initializeOptimisticUpdates = (queryClient: QueryClient): OptimisticUpdatesService => {
  if (!globalOptimisticService) {
    globalOptimisticService = new OptimisticUpdatesService(queryClient);
  }
  return globalOptimisticService;
};

/**
 * Get global optimistic updates service
 */
export const getOptimisticUpdatesService = (): OptimisticUpdatesService | null => {
  return globalOptimisticService;
};
