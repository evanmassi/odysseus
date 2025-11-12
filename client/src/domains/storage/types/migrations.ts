/**
 * Storage Configuration Migration Type Definitions
 *
 * Type guards and interfaces for safe data migrations between schema versions.
 * Handles backward compatibility with legacy localStorage data.
 */

import type { GridConfiguration } from '@odysseus/shared-schemas';

/**
 * Legacy grid configuration format (v1)
 * Old schema used 'columns' instead of 'cols'
 */
export interface LegacyGridConfig {
  rows: number;
  columns: number;
  totalPositions?: number;
  displayName?: string;
}

/**
 * Type guard to check if value is a valid GridConfiguration
 */
export function isGridConfiguration(value: unknown): value is GridConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['rows'] === 'number' &&
    typeof obj['cols'] === 'number' &&
    typeof obj['template'] === 'string'
  );
}

/**
 * Type guard to check if value is a legacy grid configuration
 */
export function isLegacyGridConfig(value: unknown): value is LegacyGridConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['rows'] === 'number' &&
    typeof obj['columns'] === 'number' &&
    !('cols' in obj) // Distinguish from new format
  );
}

/**
 * Type guard for configuration objects with equipment property
 */
export function hasEquipment(value: unknown): value is { equipment: Record<string, unknown> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'equipment' in value &&
    typeof (value as Record<string, unknown>)['equipment'] === 'object'
  );
}

/**
 * Type guard for equipment with racks array
 */
export function hasRacks(equipment: Record<string, unknown>): equipment is { racks: unknown[] } {
  return (
    'racks' in equipment &&
    Array.isArray(equipment['racks'])
  );
}

/**
 * Type guard for equipment with tanks array
 */
export function hasTanks(equipment: Record<string, unknown>): equipment is { tanks: unknown[] } {
  return (
    'tanks' in equipment &&
    Array.isArray(equipment['tanks'])
  );
}
