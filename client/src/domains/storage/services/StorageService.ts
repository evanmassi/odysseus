import {
  StorageResponseSchema,
  storageVersionResponseSchema,
  addTankResponseSchema,
  addRacksResponseSchema,
  addBoxesResponseSchema,
  bulkOperationResponseSchema,
  boxGridUpdateResponseSchema,
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type {
  BoxGridUpdateResponse,
  StorageResponse,
  UpdateBoxGridRequest,
} from '@odysseus/shared-schemas';

export class StorageService {
  static async loadConfiguration(): Promise<StorageResponse> {
    return httpClient.getData('/storage', StorageResponseSchema);
  }

  static async getConfigVersion(): Promise<number> {
    const { version } = await httpClient.getData('/storage/version', storageVersionResponseSchema);
    return version;
  }

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

  static async deleteTank(tankId: string): Promise<void> {
    await httpClient.delete(`/storage/tanks/${tankId}`);
  }

  static async addRacks(tankId: string, count: number): Promise<{ rackIds: string[] }> {
    return httpClient.postData(`/storage/tanks/${tankId}/racks`, { count }, addRacksResponseSchema);
  }

  static async updateRack(
    tankId: string,
    rackId: string,
    updates: { name?: string; isActive?: boolean }
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}`, updates);
  }

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

  static async updateBoxGrid(request: UpdateBoxGridRequest): Promise<BoxGridUpdateResponse> {
    return httpClient.putData('/storage/box-grid', request, boxGridUpdateResponseSchema);
  }

  static async deleteBox(tankId: string, rackId: string, boxId: string): Promise<void> {
    await httpClient.delete(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}`);
  }

  static async assignBox(
    tankId: string,
    rackId: string,
    boxId: string,
    // PITFALL: null means common (everyone); undefined omits the field, read as inherit.
    assignedUserId: string | null | undefined
  ): Promise<void> {
    await httpClient.put(`/storage/tanks/${tankId}/racks/${rackId}/boxes/${boxId}/assign`, {
      assignedUserId,
    });
  }

  static async bulkUnassignResources(
    fromUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number; protectedSkipped: number }> {
    return httpClient.postData(
      '/storage/bulk-unassign',
      { fromUserId },
      bulkOperationResponseSchema
    );
  }

  static async bulkReassignResources(
    fromUserId: string | undefined,
    toUserId: string
  ): Promise<{ racksAffected: number; boxesAffected: number; protectedSkipped: number }> {
    return httpClient.postData(
      '/storage/bulk-reassign',
      fromUserId ? { fromUserId, toUserId } : { toUserId },
      bulkOperationResponseSchema
    );
  }

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
