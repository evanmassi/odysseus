import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { queryKeys } from '@app/queryKeys';

import { StorageService } from '../services/StorageService';

import type { PositionDisplayConfig } from '@odysseus/shared-schemas';

/**
 * Get Position Display Presets Hook
 *
 * Fetches available position display format presets from server.
 * Used to populate UI selectors for box position configuration.
 *
 * @example
 * const { data: presetsData } = usePositionDisplayPresetsQuery();
 * // presetsData.presets.alphanumericStandard → { format: 'alphanumeric', ... }
 */
export const usePositionDisplayPresetsQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
  return useQuery({
    queryKey: queryKeys.storage.positionDisplayPresets(),
    queryFn: () => StorageService.getPositionDisplayPresets(),
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 60 * 60 * 1000, // 1 hour (presets rarely change)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Update Box Position Display Mutation Hook
 *
 * Updates position display configuration for a specific box.
 * Invalidates storage cache and shows user feedback via toast notifications.
 *
 * @example
 * const updatePositionDisplay = useUpdateBoxPositionDisplayMutation();
 *
 * updatePositionDisplay.mutate({
 *   tankId: 'tank-1',
 *   rackId: '1',
 *   boxId: 'A',
 *   positionDisplay: { format: 'alphanumeric', ... }
 * });
 */
export const useUpdateBoxPositionDisplayMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateBoxPositionDisplay'],
    mutationFn: ({
      tankId,
      rackId,
      boxId,
      positionDisplay,
    }: {
      tankId: string;
      rackId: string;
      boxId: string;
      positionDisplay: PositionDisplayConfig | null;
    }) => StorageService.updateBoxPositionDisplay(tankId, rackId, boxId, positionDisplay),

    onSuccess: (_, variables) => {
      // Invalidate storage cache to reflect updated configuration
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage(),
      });

      // Show success feedback
      const formatName = variables.positionDisplay?.format === 'numeric'
        ? 'Numeric (1-81)'
        : 'Alphanumeric (A1-I9)';

      toast.success(
        variables.positionDisplay
          ? `Position display updated to ${formatName}`
          : 'Position display reset to default'
      );
    },

    onError: (error: any, variables) => {
      // Show error feedback
      console.error('❌ [useUpdateBoxPositionDisplayMutation] Failed:', error);
      toast.error(`Failed to update position display: ${error.message || 'Unknown error'}`);
    },
  });
};

/**
 * Update Lab Default Position Display Mutation Hook
 *
 * Updates the lab-wide default position display configuration.
 * This affects all boxes that don't have a custom position display override.
 * Invalidates storage cache and shows user feedback via toast notifications.
 *
 * @example
 * const updateLabDefault = useUpdateLabDefaultPositionDisplayMutation();
 *
 * updateLabDefault.mutate({
 *   positionDisplay: { format: 'numeric', ... }
 * });
 */
export const useUpdateLabDefaultPositionDisplayMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateLabDefaultPositionDisplay'],
    mutationFn: ({
      positionDisplay,
    }: {
      positionDisplay: PositionDisplayConfig | null;
    }) => StorageService.updateLabDefaultPositionDisplay(positionDisplay),

    onSuccess: (_, variables) => {
      // Invalidate storage cache to reflect updated configuration
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage(),
      });

      // Show success feedback
      const formatName = variables.positionDisplay?.format === 'numeric'
        ? 'Numeric (1-81)'
        : 'Alphanumeric (A1-I9)';

      toast.success(
        variables.positionDisplay
          ? `Lab default updated to ${formatName}`
          : 'Lab default reset to system default'
      );
    },

    onError: (error: any, variables) => {
      // Show error feedback
      console.error('❌ [useUpdateLabDefaultPositionDisplayMutation] Failed:', error);
      toast.error(`Failed to update lab default: ${error.message || 'Unknown error'}`);
    },
  });
};
