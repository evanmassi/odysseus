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
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type { StorageResponse, GridConfiguration } from '@odysseus/shared-schemas';

export class StorageService {
  static async loadConfiguration(): Promise<StorageResponse> {
    return httpClient.getData('/storage', StorageResponseSchema);
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

  static async addTank(name: string): Promise<{ tankId: string }> {
    return httpClient.postData('/storage/tanks', { name }, addTankResponseSchema);
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

  static async addRacks(tankId: string, count: number): Promise<{ rackIds: string[] }> {
    return httpClient.postData(`/storage/tanks/${tankId}/racks`, { count }, addRacksResponseSchema);
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

  static async addBoxes(
    tankId: string,
    rackId: string,
    count: number
  ): Promise<{ boxIds: string[] }> {
    return httpClient.postData(
      `/storage/tanks/${tankId}/racks/${rackId}/boxes`,
      { count },
      addBoxesResponseSchema
    );
  }

  static async updateBox(
    tankId: string,
    rackId: string,
    boxId: string,
    updates: { gridConfig?: GridConfiguration }
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

  /** Unassign all resources from a user. Used when deactivating users. */
  static async bulkUnassignResources(
    fromUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    return httpClient.postData(
      '/storage/bulk-unassign',
      { fromUserId },
      bulkOperationResponseSchema
    );
  }

  static async bulkReassignResources(
    fromUserId: string,
    toUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number }> {
    return httpClient.postData(
      '/storage/bulk-reassign',
      { fromUserId, toUserId },
      bulkOperationResponseSchema
    );
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
