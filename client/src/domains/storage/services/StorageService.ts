import { StorageResponseSchema, positionDisplayConfigSchema } from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';
import { InfrastructureError } from '@shared/errors';

import type {
  StorageResponse,
  PositionDisplayConfig,
  POSITION_DISPLAY_PRESETS,
  GridConfiguration,
} from '@odysseus/shared-schemas';

// Response schemas for CQRS operations
const AddTankResponseSchema = z.object({ success: z.boolean(), tankId: z.string() });
const AddRacksResponseSchema = z.object({ success: z.boolean(), rackIds: z.array(z.string()) });
const AddBoxesResponseSchema = z.object({ success: z.boolean(), boxIds: z.array(z.string()) });
const BulkOperationResponseSchema = z.object({
  racksAffected: z.number(),
  boxesAffected: z.number(),
});
const SuccessResponseSchema = z.object({ success: z.boolean() });

/**
 * Storage Configuration API
 *
 * HTTP client for storage equipment CRUD and configuration management.
 */
export class StorageService {
  static async loadConfiguration(): Promise<StorageResponse> {
    try {
      const response = await httpClient.getData('/storage', StorageResponseSchema);
      return response;
    } catch (error) {
      logger.error('StorageService load configuration failed', { error });
      throw new InfrastructureError('API_ERROR', 'Failed to load configuration from server', {
        originalError: error,
      });
    }
  }

  // Returns false on any error — used during bootstrap to detect first-time setup
  static async checkConfigurationExists(): Promise<boolean> {
    try {
      const { exists } = await httpClient.getData(
        '/storage/exists',
        z.object({ exists: z.boolean() })
      );
      return exists;
    } catch (error) {
      return false;
    }
  }

  static async getPositionDisplayPresets(): Promise<{
    presets: typeof POSITION_DISPLAY_PRESETS;
    description: Record<string, string>;
  }> {
    try {
      const responseSchema = z.object({
        success: z.boolean(),
        presets: z.object({
          NUMERIC: positionDisplayConfigSchema,
          ALPHANUMERIC_STANDARD: positionDisplayConfigSchema,
          ALPHANUMERIC_REVERSE: positionDisplayConfigSchema,
        }),
        description: z.record(z.string(), z.string()),
      });

      const response = await httpClient.getData(
        '/storage/position-display-presets',
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

  /** Pass null to reset to system default (alphanumeric). */
  static async updateBoxPositionDisplay(
    tankId: string,
    rackId: string,
    boxId: string,
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    try {
      await httpClient.put('/storage/box-position-display', {
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

  /** Boxes with custom overrides are not affected. Pass null to fall back to system default. */
  static async updateLabDefaultPositionDisplay(
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    try {
      await httpClient.put('/storage/lab-position-display', {
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

  /** Resource owners can set their own labels via canEditResource, not just admins. */
  static async updateResourceLabel(
    resourceType: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    customLabel: string | undefined
  ): Promise<void> {
    try {
      await httpClient.put('/storage/resource-label', {
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

  static async addTank(name: string, location?: string): Promise<{ tankId: string }> {
    try {
      const response = await httpClient.postData(
        '/storage/tanks',
        { name, location },
        AddTankResponseSchema
      );
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

  static async updateTank(
    tankId: string,
    updates: { name?: string; location?: string; isActive?: boolean }
  ): Promise<void> {
    try {
      await httpClient.put(`/storage/tanks/${tankId}`, updates);
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
  static async deleteTank(tankId: string): Promise<void> {
    try {
      await httpClient.delete(`/storage/tanks/${tankId}`);
    } catch (error) {
      logger.error('StorageService delete tank failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to delete tank ${tankId}`, {
        originalError: error,
        tankId,
      });
    }
  }

  // CQRS Rack Operations

  static async addRacks(tankId: string, count: number): Promise<{ rackIds: string[] }> {
    try {
      const response = await httpClient.postData(
        `/storage/tanks/${tankId}/racks`,
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

  static async updateRack(
    tankId: string,
    rackId: string,
    updates: { name?: string; capacity?: number; isActive?: boolean }
  ): Promise<void> {
    try {
      await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}`, updates);
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
      await httpClient.delete(`/storage/tanks/${tankId}/racks/${rackId}`);
    } catch (error) {
      logger.error('StorageService delete rack failed', { error });
      throw new InfrastructureError('API_ERROR', `Failed to delete rack ${rackId}`, {
        originalError: error,
        tankId,
        rackId,
      });
    }
  }

  static async assignRack(
    tankId: string,
    rackId: string,
    assignedUserId: string | null
  ): Promise<void> {
    try {
      await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/assign`, {
        assignedUserId,
      });
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

  static async addBoxes(
    tankId: string,
    rackId: string,
    count: number
  ): Promise<{ boxIds: string[] }> {
    try {
      const response = await httpClient.postData(
        `/storage/tanks/${tankId}/racks/${rackId}/boxes`,
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
      await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`, updates);
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
      await httpClient.delete(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`);
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

  static async assignBox(
    tankId: string,
    rackId: string,
    boxId: string,
    assignedUserId: string | null
  ): Promise<void> {
    try {
      await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}/assign`, {
        assignedUserId,
      });
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
  static async bulkUnassignResources(
    fromUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    try {
      const response = await httpClient.postData(
        '/storage/bulk-unassign',
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

  static async bulkReassignResources(
    fromUserId: string,
    toUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    try {
      const response = await httpClient.postData(
        '/storage/bulk-reassign',
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
      await httpClient.postData(
        '/storage/initialize',
        { labName, tankCount, racksPerTank },
        SuccessResponseSchema
      );
    } catch (error) {
      logger.error('StorageService initialize configuration failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to initialize configuration';
      throw new InfrastructureError('API_ERROR', message, {
        originalError: error,
        labName,
        tankCount,
        racksPerTank,
      });
    }
  }
}
