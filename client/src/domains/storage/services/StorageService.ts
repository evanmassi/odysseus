/**
 * Storage Configuration API
 *
 * HTTP client for storage equipment CRUD and configuration management.
 */
import {
  StorageResponseSchema,
  addTankResponseSchema,
  addRacksResponseSchema,
  addBoxesResponseSchema,
  bulkOperationResponseSchema,
  positionDisplayPresetsResponseSchema,
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type {
  StorageResponse,
  PositionDisplayConfig,
  POSITION_DISPLAY_PRESETS,
  GridConfiguration,
} from '@odysseus/shared-schemas';

export class StorageService {
  static async loadConfiguration(): Promise<StorageResponse> {
    return httpClient.getData('/storage', StorageResponseSchema);
  }

  static async getPositionDisplayPresets(): Promise<{
    presets: typeof POSITION_DISPLAY_PRESETS;
    description: Record<string, string>;
  }> {
    const response = await httpClient.getData(
      '/storage/position-display-presets',
      positionDisplayPresetsResponseSchema
    );

    return {
      presets: response.presets as typeof POSITION_DISPLAY_PRESETS,
      description: response.description as Record<string, string>,
    };
  }

  /** Pass null to reset to system default (alphanumeric). */
  static async updateBoxPositionDisplay(
    tankId: string,
    rackId: string,
    boxId: string,
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    await httpClient.put('/storage/box-position-display', {
      tankId,
      rackId,
      boxId,
      positionDisplay,
    });
  }

  /** Boxes with custom overrides are not affected. Pass null to fall back to system default. */
  static async updateLabDefaultPositionDisplay(
    positionDisplay: PositionDisplayConfig | null
  ): Promise<void> {
    await httpClient.put('/storage/lab-position-display', {
      positionDisplay,
    });
  }

  /** Resource owners can set their own labels via canEditResource, not just admins. */
  static async updateResourceLabel(
    resourceType: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    customLabel: string | undefined
  ): Promise<void> {
    await httpClient.put('/storage/resource-label', {
      resourceType,
      tankId,
      rackId,
      boxId,
      customLabel,
    });
  }

  static async updateSystemSettings(labName: string): Promise<void> {
    await httpClient.put('/storage/system', { labName });
  }

  // CQRS Tank Operations

  static async addTank(name: string, location?: string): Promise<{ tankId: string }> {
    const response = await httpClient.postData(
      '/storage/tanks',
      { name, location },
      addTankResponseSchema
    );
    return { tankId: response.tankId };
  }

  static async updateTank(
    tankId: string,
    updates: { name?: string; location?: string; isActive?: boolean }
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}`, updates);
  }

  /** Delete a tank (blocks if tubes exist). */
  static async deleteTank(tankId: string): Promise<void> {
    await httpClient.delete(`/storage/tanks/${tankId}`);
  }

  // CQRS Rack Operations

  static async addRacks(tankId: string, count: number): Promise<{ rackIds: string[] }> {
    const response = await httpClient.postData(
      `/storage/tanks/${tankId}/racks`,
      { count },
      addRacksResponseSchema
    );
    return { rackIds: response.rackIds };
  }

  static async updateRack(
    tankId: string,
    rackId: string,
    updates: { name?: string; capacity?: number; isActive?: boolean }
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}`, updates);
  }

  /** Delete a rack (blocks if tubes exist). */
  static async deleteRack(tankId: string, rackId: string): Promise<void> {
    await httpClient.delete(`/storage/tanks/${tankId}/racks/${rackId}`);
  }

  static async assignRack(
    tankId: string,
    rackId: string,
    assignedUserId: string | null
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/assign`, {
      assignedUserId,
    });
  }

  // CQRS Box Operations

  static async addBoxes(
    tankId: string,
    rackId: string,
    count: number
  ): Promise<{ boxIds: string[] }> {
    const response = await httpClient.postData(
      `/storage/tanks/${tankId}/racks/${rackId}/boxes`,
      { count },
      addBoxesResponseSchema
    );
    return { boxIds: response.boxIds };
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
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`, updates);
  }

  /** Delete a box (blocks if tubes exist). */
  static async deleteBox(tankId: string, rackId: string, boxId: string): Promise<void> {
    await httpClient.delete(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`);
  }

  static async assignBox(
    tankId: string,
    rackId: string,
    boxId: string,
    assignedUserId: string | null
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}/assign`, {
      assignedUserId,
    });
  }

  // CQRS Bulk Operations

  /** Unassign all resources from a user. Used when deactivating users. */
  static async bulkUnassignResources(
    fromUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    const response = await httpClient.postData(
      '/storage/bulk-unassign',
      { fromUserId },
      bulkOperationResponseSchema
    );
    return { racksAffected: response.racksAffected, boxesAffected: response.boxesAffected };
  }

  static async bulkReassignResources(
    fromUserId: string,
    toUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    const response = await httpClient.postData(
      '/storage/bulk-reassign',
      { fromUserId, toUserId },
      bulkOperationResponseSchema
    );
    return { racksAffected: response.racksAffected, boxesAffected: response.boxesAffected };
  }

  /** Initialize configuration for a fresh install. */
  static async initializeConfiguration(
    labName: string,
    tankCount: number,
    racksPerTank: number
  ): Promise<void> {
    await httpClient.postData(
      '/storage/initialize',
      { labName, tankCount, racksPerTank },
      messageResponseSchema
    );
  }
}
