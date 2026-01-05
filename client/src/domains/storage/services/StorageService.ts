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
  GridConfiguration,
} from '@odysseus/shared-schemas';

// Response schemas for CQRS operations
const AddTankResponseSchema = z.object({ success: z.boolean(), tankId: z.string() });
const AddRacksResponseSchema = z.object({ success: z.boolean(), rackIds: z.array(z.string()) });
const AddBoxesResponseSchema = z.object({ success: z.boolean(), boxIds: z.array(z.string()) });
const BulkOperationResponseSchema = z.object({
  success: z.boolean(),
  racksAffected: z.number(),
  boxesAffected: z.number(),
});
const SuccessResponseSchema = z.object({ success: z.boolean() });

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

  // CQRS Tank Operations

  /** Add a new tank to the configuration. */
  static async addTank(name: string, location?: string): Promise<{ tankId: string }> {
    try {
      const response = await httpClient.postData('/configuration/tanks', { name, location }, AddTankResponseSchema);
      return { tankId: response.tankId };
    } catch (error) {
      logger.error('StorageService add tank failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to add tank', {
        originalError: error,
        name,
        location,
      });
    }
  }

  /** Update an existing tank's properties. */
  static async updateTank(
    tankId: string,
    updates: { name?: string; location?: string; isActive?: boolean }
  ): Promise<void> {
    try {
      await httpClient.put(`/configuration/tanks/${tankId}`, updates);
    } catch (error) {
      logger.error('StorageService update tank failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to update tank ${tankId}`, {
        originalError: error,
        tankId,
        updates,
      });
    }
  }

  /** Delete a tank (blocks if tubes exist). */
  static async deleteTankCQRS(tankId: string): Promise<void> {
    try {
      await httpClient.delete(`/configuration/tanks/${tankId}`);
    } catch (error) {
      logger.error('StorageService delete tank failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to delete tank ${tankId}`, {
        originalError: error,
        tankId,
      });
    }
  }

  // CQRS Rack Operations

  /** Add one or more racks to a tank. */
  static async addRacks(tankId: string, count: number): Promise<{ rackIds: string[] }> {
    try {
      const response = await httpClient.postData(
        `/configuration/tanks/${tankId}/racks`,
        { count },
        AddRacksResponseSchema
      );
      return { rackIds: response.rackIds };
    } catch (error) {
      logger.error('StorageService add racks failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to add racks to tank ${tankId}`, {
        originalError: error,
        tankId,
        count,
      });
    }
  }

  /** Update an existing rack's properties. */
  static async updateRack(
    tankId: string,
    rackId: string,
    updates: { name?: string; capacity?: number; isActive?: boolean }
  ): Promise<void> {
    try {
      await httpClient.put(`/configuration/tanks/${tankId}/racks/${rackId}`, updates);
    } catch (error) {
      logger.error('StorageService update rack failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to update rack ${rackId}`, {
        originalError: error,
        tankId,
        rackId,
        updates,
      });
    }
  }

  /** Delete a rack (blocks if tubes exist). */
  static async deleteRack(tankId: string, rackId: string): Promise<void> {
    try {
      await httpClient.delete(`/configuration/tanks/${tankId}/racks/${rackId}`);
    } catch (error) {
      logger.error('StorageService delete rack failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to delete rack ${rackId}`, {
        originalError: error,
        tankId,
        rackId,
      });
    }
  }

  /** Assign or unassign a rack to/from a user. */
  static async assignRack(tankId: string, rackId: string, assignedUserId: string | null): Promise<void> {
    try {
      await httpClient.put(`/configuration/tanks/${tankId}/racks/${rackId}/assign`, { assignedUserId });
    } catch (error) {
      logger.error('StorageService assign rack failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to assign rack ${rackId}`, {
        originalError: error,
        tankId,
        rackId,
        assignedUserId,
      });
    }
  }

  // CQRS Box Operations

  /** Add one or more boxes to a rack. */
  static async addBoxes(tankId: string, rackId: string, count: number): Promise<{ boxIds: string[] }> {
    try {
      const response = await httpClient.postData(
        `/configuration/tanks/${tankId}/racks/${rackId}/boxes`,
        { count },
        AddBoxesResponseSchema
      );
      return { boxIds: response.boxIds };
    } catch (error) {
      logger.error('StorageService add boxes failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to add boxes to rack ${rackId}`, {
        originalError: error,
        tankId,
        rackId,
        count,
      });
    }
  }

  /** Update an existing box's properties. */
  static async updateBox(
    tankId: string,
    rackId: string,
    boxId: string,
    updates: {
      name?: string;
      gridConfig?: GridConfiguration;
      positionDisplay?: PositionDisplayConfig | null;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      await httpClient.put(`/configuration/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`, updates);
    } catch (error) {
      logger.error('StorageService update box failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to update box ${boxId}`, {
        originalError: error,
        tankId,
        rackId,
        boxId,
        updates,
      });
    }
  }

  /** Delete a box (blocks if tubes exist). */
  static async deleteBox(tankId: string, rackId: string, boxId: string): Promise<void> {
    try {
      await httpClient.delete(`/configuration/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`);
    } catch (error) {
      logger.error('StorageService delete box failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to delete box ${boxId}`, {
        originalError: error,
        tankId,
        rackId,
        boxId,
      });
    }
  }

  /** Assign or unassign a box to/from a user. */
  static async assignBox(
    tankId: string,
    rackId: string,
    boxId: string,
    assignedUserId: string | null
  ): Promise<void> {
    try {
      await httpClient.put(`/configuration/tanks/${tankId}/racks/${rackId}/boxes/${boxId}/assign`, { assignedUserId });
    } catch (error) {
      logger.error('StorageService assign box failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to assign box ${boxId}`, {
        originalError: error,
        tankId,
        rackId,
        boxId,
        assignedUserId,
      });
    }
  }

  // CQRS Bulk Operations

  /** Unassign all resources from a user. Used when deactivating users. */
  static async bulkUnassignResources(fromUserId: string): Promise<{ racksAffected: number; boxesAffected: number }> {
    try {
      const response = await httpClient.postData(
        '/configuration/bulk-unassign',
        { fromUserId },
        BulkOperationResponseSchema
      );
      return { racksAffected: response.racksAffected, boxesAffected: response.boxesAffected };
    } catch (error) {
      logger.error('StorageService bulk unassign failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to bulk unassign resources', {
        originalError: error,
        fromUserId,
      });
    }
  }

  /** Reassign all resources from one user to another. */
  static async bulkReassignResources(
    fromUserId: string,
    toUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    try {
      const response = await httpClient.postData(
        '/configuration/bulk-reassign',
        { fromUserId, toUserId },
        BulkOperationResponseSchema
      );
      return { racksAffected: response.racksAffected, boxesAffected: response.boxesAffected };
    } catch (error) {
      logger.error('StorageService bulk reassign failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to bulk reassign resources', {
        originalError: error,
        fromUserId,
        toUserId,
      });
    }
  }

  /** Initialize configuration for a fresh install. */
  static async initializeConfiguration(
    labName: string,
    tankCount: number,
    racksPerTank: number
  ): Promise<void> {
    try {
      await httpClient.postData('/configuration/initialize', { labName, tankCount, racksPerTank }, SuccessResponseSchema);
    } catch (error) {
      logger.error('StorageService initialize configuration failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to initialize configuration', {
        originalError: error,
        labName,
        tankCount,
        racksPerTank,
      });
    }
  }
}
