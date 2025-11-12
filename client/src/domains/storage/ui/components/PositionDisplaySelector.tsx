/**
 * Position Display Selector Component
 *
 * Allows users to change position display format for a specific box.
 * Supports numeric (1-81) and alphanumeric (A1-I9) formats.
 */

import React, { useMemo } from 'react';

import {
  usePositionDisplayPresetsQuery,
  useUpdateBoxPositionDisplayMutation,
} from '@domains/storage/hooks/useBoxPositionDisplay';
import { useStorageStore } from '@domains/storage/stores/storageStore';
import {
  getPositionDisplayForBox,
  hasCustomPositionDisplay,
} from '@domains/storage/utils/positionDisplayUtils';
import { Select, type SelectOption } from '@shared/ui/primitives/select/Select';

import type { GridConfiguration } from '@odysseus/shared-schemas';

export interface PositionDisplaySelectorProps {
  tankId: string;
  rackId: string;
  boxId: string;
  gridConfig: GridConfiguration;

  /**
   * Optional label for the selector
   * @default "Position Display Format"
   */
  label?: string;

  /**
   * Size variant
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Optional callback when format changes
   */
  onChange?: (format: 'numeric' | 'alphanumeric' | null) => void;

  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Position Display Selector Component
 *
 * @example
 * <PositionDisplaySelector
 *   tankId="tank-1"
 *   rackId="1"
 *   boxId="A"
 *   gridConfig={{ rows: 9, cols: 9, template: 'standard' }}
 * />
 */
export const PositionDisplaySelector: React.FC<PositionDisplaySelectorProps> = ({
  tankId,
  rackId,
  boxId,
  gridConfig,
  label = 'Position Display Format',
  size = 'md',
  onChange,
  className,
}) => {
  // Fetch available presets
  const { data: presetsData, isLoading: isLoadingPresets } = usePositionDisplayPresetsQuery();

  // Mutation for updating display format
  const updateMutation = useUpdateBoxPositionDisplayMutation();

  // Get current lab configuration to check for lab default
  const currentLab = useStorageStore((state) => state.currentLab);
  const labDefault = currentLab?.settings?.defaultPositionDisplay;

  // Get current display configuration
  const currentConfig = getPositionDisplayForBox(tankId, rackId, boxId, gridConfig);
  const hasCustomConfig = hasCustomPositionDisplay(tankId, rackId, boxId);

  // Build select options
  const options: SelectOption[] = useMemo(() => {
    if (!presetsData) return [];

    const opts: SelectOption[] = [
      {
        value: 'numeric',
        label: 'Numeric (1-81)',
        description: 'Simple numeric labels: 1, 2, 3, ..., 81',
        disabled: false,
      },
      {
        value: 'alphanumeric',
        label: 'Alphanumeric (A1-I9)',
        description: 'Excel-style labels: A1, A2, B1, B2, ..., I9',
        disabled: false,
      },
    ];

    // Add reset option if box has custom config
    if (hasCustomConfig) {
      const resetDescription = labDefault
        ? `Reset to lab default (${labDefault.format === 'numeric' ? 'Numeric' : 'Alphanumeric'})`
        : 'Reset to system default (Alphanumeric)';

      opts.push({
        value: 'default',
        label: 'Reset to Default',
        description: resetDescription,
        disabled: false,
      });
    }

    return opts;
  }, [presetsData, hasCustomConfig, labDefault]);

  // Determine current value
  const currentValue = currentConfig.format;

  // Handle selection change
  const handleChange = (value: string | number | (string | number)[] | null) => {
    if (Array.isArray(value) || value === null) return;

    const format = value as 'numeric' | 'alphanumeric' | 'default';

    // Handle reset to default
    if (format === 'default') {
      updateMutation.mutate({
        tankId,
        rackId,
        boxId,
        positionDisplay: null, // null = reset to default
      });
      onChange?.(null);
      return;
    }

    // Determine position display config
    let positionDisplay;

    if (format === 'numeric') {
      positionDisplay = presetsData?.presets.NUMERIC ?? { format: 'numeric' as const };
    } else {
      // Alphanumeric - use appropriate preset based on grid size
      const preset = presetsData?.presets.ALPHANUMERIC_STANDARD;
      if (preset) {
        // If grid size matches preset (9x9), use as-is
        positionDisplay = preset;
      } else {
        // For custom grid sizes, would need to generate config
        // For now, use standard preset
        positionDisplay = presetsData?.presets.ALPHANUMERIC_STANDARD ?? {
          format: 'alphanumeric' as const,
          alphanumericConfig: {
            rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
            colLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            format: 'row-col' as const,
          },
        };
      }
    }

    updateMutation.mutate({
      tankId,
      rackId,
      boxId,
      positionDisplay,
    });

    onChange?.(format);
  };

  // Determine hierarchy description
  const getHierarchyDescription = (): string => {
    if (hasCustomConfig) {
      return 'Custom format for this box';
    }

    if (labDefault) {
      const formatName = labDefault.format === 'numeric' ? 'Numeric' : 'Alphanumeric';
      return `Using lab default (${formatName})`;
    }

    return 'Using system default (Alphanumeric)';
  };

  return (
    <Select
      label={label}
      options={options}
      value={currentValue}
      onChange={handleChange}
      disabled={isLoadingPresets || updateMutation.isPending}
      loading={isLoadingPresets || updateMutation.isPending}
      size={size}
      className={className}
      closeOnSelect={true}
      placeholder="Select position format..."
      description={getHierarchyDescription()}
    />
  );
};
