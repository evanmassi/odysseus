import {
  ConfigurationResponseSchema,
  SaveConfigurationRequestSchema,
  DeleteTankResponseSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api/httpClient';
import { InfrastructureError } from '@shared/errors/AppError';
import { logger } from '@shared/infrastructure/logger';

import type {
  ConfigurationResponse,
  DeleteTankResponse,
  SystemConfiguration,
  LabConfiguration,
  PositionDisplayConfig,
  POSITION_DISPLAY_PRESETS,
} from '@odysseus/shared-schemas';

/**
 * Modern Storage Service with Zod validation and proper error handling
 */
export class StorageService {
  /**
   * Load configuration from server
   */
  static async loadConfiguration(): Promise<ConfigurationResponse> {
    try {
      const response = await httpClient.getData('/configuration', ConfigurationResponseSchema);
      return response;
    } catch (error) {
      logger.error('StorageService load configuration failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to load configuration from server', {
        originalError: error,
      });
    }
  }

  /**
   * Save configuration to server
   */
  static async saveConfiguration(
    systemConfig: SystemConfiguration,
    currentLab: LabConfiguration
  ): Promise<void> {
    try {
      const requestData = SaveConfigurationRequestSchema.parse({
        configuration: { systemConfig, currentLab },
      });

      await httpClient.put('/configuration', requestData);
    } catch (error) {
      logger.error('StorageService save configuration failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to save configuration to server', {
        originalError: error,
        systemConfig,
        currentLab,
      });
    }
  }

  /**
   * Delete tank (with tubes cleanup)
   */
  static async deleteTank(tankId: string): Promise<DeleteTankResponse> {
    try {
      return await httpClient.deleteWithData(`/tanks/${tankId}`, DeleteTankResponseSchema);
    } catch (error) {
      throw new InfrastructureError('API_ERROR', `Failed to delete tank ${tankId}`, {
        originalError: error,
        tankId,
      });
    }
  }

  /**
   * Check if configuration exists on server
   */
  static async checkConfigurationExists(): Promise<boolean> {
    try {
      const { exists } = await httpClient.getData(
        '/configuration/exists',
        z.object({ exists: z.boolean() })
      );
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available position display presets from server
   *
   * Returns presets for numeric and alphanumeric position display formats.
   * These can be used to populate UI selectors for box position configuration.
   *
   * @returns Position display presets with descriptions
   */
  static async getPositionDisplayPresets(): Promise<{
    presets: typeof POSITION_DISPLAY_PRESETS;
    description: Record<string, string>;
  }> {
    try {
      const responseSchema = z.object({
        success: z.boolean(),
        presets: z.object({
          NUMERIC: z.any(),
          ALPHANUMERIC_STANDARD: z.any(),
          ALPHANUMERIC_REVERSE: z.any(),
        }),
        description: z.record(z.string(), z.string()),
      });

      const response = await httpClient.getData(
        '/configuration/position-display-presets',
        responseSchema
      );

      return {
        presets: response.presets as typeof POSITION_DISPLAY_PRESETS,
        description: response.description as Record<string, string>,
      };
    } catch (error) {
      logger.error('StorageService get position display presets failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to fetch position display presets', {
        originalError: error,
      });
    }
  }

  /**
   * Update position display configuration for a specific box
   *
   * Allows changing how position numbers are displayed (numeric vs alphanumeric).
   * Pass null to reset to system default (alphanumeric).
   *
   * @param tankId - Tank identifier
   * @param rackId - Rack identifier
   * @param boxId - Box identifier
   * @param positionDisplay - New position display config (null = reset to default)
   */
  static async updateBoxPositionDisplay(
    tankId: string,
    rackId: string,
    boxId: string,
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    try {
      await httpClient.put('/configuration/box-position-display', {
        tankId,
        rackId,
        boxId,
        positionDisplay,
      });
    } catch (error) {
      logger.error('StorageService update box position display failed', { error });
      throw new InfrastructureError(
        'API_ERROR',
        `Failed to update position display for box ${boxId}`,
        { originalError: error, tankId, rackId, boxId, positionDisplay }
      );
    }
  }

  /**
   * Update lab-wide default position display configuration
   *
   * Sets the default position display format for all boxes in the lab.
   * Boxes with custom overrides will not be affected.
   * Pass null to clear the lab default and fall back to system default (alphanumeric).
   *
   * @param positionDisplay - New lab default position display config (null = reset to system default)
   */
  static async updateLabDefaultPositionDisplay(
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    try {
      await httpClient.put('/configuration/lab-position-display', {
        positionDisplay,
      });
    } catch (error) {
      logger.error('StorageService update lab default position display failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to update lab default position display', {
        originalError: error,
        positionDisplay,
      });
    }
  }

  /**
   * Update custom label for a rack or box
   *
   * Uses fine-grained permissions (canEditResource) to allow resource owners
   * to set their own labels, not just admins.
   *
   * @param resourceType - 'rack' or 'box'
   * @param tankId - Tank identifier
   * @param rackId - Rack identifier
   * @param boxId - Box identifier (required for box type)
   * @param customLabel - New label (empty/undefined = clear label)
   */
  static async updateResourceLabel(
    resourceType: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    customLabel: string | undefined
  ): Promise<void> {
    try {
      await httpClient.put('/configuration/resource-label', {
        resourceType,
        tankId,
        rackId,
        boxId,
        customLabel,
      });
    } catch (error) {
      logger.error('StorageService update resource label failed', { error });
      throw new InfrastructureError(
        'API_ERROR',
        `Failed to update label for ${resourceType} ${resourceType === 'box' ? boxId : rackId}`,
        { originalError: error, resourceType, tankId, rackId, boxId, customLabel }
      );
    }
  }
}
