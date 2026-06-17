/**
 * Tube Data Service
 *
 * Tube CRUD, bulk operations, locking, and access sharing.
 */

import {
  type TubeData,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type LockTubesRequest,
  type UnlockTubesRequest,
  type ShareTubeAccessRequest,
  type RevokeTubeAccessRequest,
  type BulkLockResult,
  type BulkUnlockResult,
  type ShareAccessResult,
  type RevokeAccessResult,
  type BulkDeleteResponse,
  type PasteTubesResponse,
  type BulkUpdateResponse,
  type TubeFilterableField,
  type TubeFilterOptions,
  type RackTube,
  type TubeLocationCount,
  tubeDataSchema,
  rackTubeSchema,
  tubeLocationCountSchema,
  tubeFilterOptionsResponseSchema,
  createTubeRequestSchema,
  updateTubeRequestSchema,
  bulkLockResultSchema,
  bulkUnlockResultSchema,
  shareAccessResultSchema,
  revokeAccessResultSchema,
  bulkDeleteResponseSchema,
  pasteTubesResponseSchema,
  bulkUpdateResponseSchema,
  bulkFetchResponseSchema,
  bulkMoveResponseSchema,
  type BulkMoveRequest,
  type BulkMoveResponse,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { normalizeDateString } from '@shared/utils/dateFormatters';

export class TubeService {
  private static readonly BASE_PATH = '/tubes';

  // Prevents timezone bugs by normalizing to YYYY-MM-DD before requests
  private static normalizeTubeDates<
    T extends Partial<CreateTubeRequest> | Partial<UpdateTubeRequest>,
  >(data: T): T {
    if (!data.sample?.date) return data;

    return {
      ...data,
      sample: {
        ...data.sample,
        date: normalizeDateString(data.sample.date),
      },
    };
  }

  static async fetchFilterOptions(fields: TubeFilterableField[]): Promise<TubeFilterOptions> {
    const query = new URLSearchParams({ fields: fields.join(',') });
    return await httpClient.getData(
      `${this.BASE_PATH}/filter-options?${query.toString()}`,
      tubeFilterOptionsResponseSchema
    );
  }

  static async fetchTubeById(id: string): Promise<TubeData> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, tubeDataSchema);
  }

  static async createTube(tubeData: CreateTubeRequest): Promise<TubeData> {
    const normalized = this.normalizeTubeDates(tubeData);
    const validatedRequest = createTubeRequestSchema.parse(normalized);
    return await httpClient.postData(this.BASE_PATH, validatedRequest, tubeDataSchema);
  }

  static async updateTube(id: string, updates: UpdateTubeRequest): Promise<TubeData> {
    const normalized = this.normalizeTubeDates(updates);
    const validatedUpdates = updateTubeRequestSchema.parse(normalized);
    return await httpClient.putData(`${this.BASE_PATH}/${id}`, validatedUpdates, tubeDataSchema);
  }

  static async deleteTube(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  static async bulkDeleteTubes(tubeIds: string[]): Promise<BulkDeleteResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk-delete`,
      { tubeIds },
      bulkDeleteResponseSchema
    );
  }

  static async fetchTubesByLocation(
    tankId: string,
    rackId: string,
    boxId: string
  ): Promise<TubeData[]> {
    const queryParams = new URLSearchParams({ tankId, rackId, boxId });
    return await httpClient.getArray(
      `${this.BASE_PATH}/location?${queryParams.toString()}`,
      tubeDataSchema
    );
  }

  static async fetchTubesByRack(tankId: string, rackId: string): Promise<RackTube[]> {
    const queryParams = new URLSearchParams({ tankId, rackId });
    return await httpClient.getArray(
      `${this.BASE_PATH}/by-rack?${queryParams.toString()}`,
      rackTubeSchema
    );
  }

  static async fetchLocationCounts(): Promise<TubeLocationCount[]> {
    return await httpClient.getArray(`${this.BASE_PATH}/location-counts`, tubeLocationCountSchema);
  }

  static async pasteTubes(tubes: CreateTubeRequest[]): Promise<PasteTubesResponse> {
    const normalizedTubes = tubes.map(tube => this.normalizeTubeDates(tube));
    const validatedRequests = normalizedTubes.map(tube => createTubeRequestSchema.parse(tube));

    return await httpClient.postData(this.BASE_PATH, validatedRequests, pasteTubesResponseSchema);
  }

  /** Uses server-side bulk endpoint for proper audit logging. */
  static async bulkUpdateTubes(
    updates: Array<{ id: string; data: UpdateTubeRequest }>
  ): Promise<BulkUpdateResponse> {
    const normalizedUpdates = updates.map(update => ({
      id: update.id,
      updates: this.normalizeTubeDates(update.data),
    }));

    return await httpClient.postData(
      `${this.BASE_PATH}/bulk-update`,
      { updates: normalizedUpdates },
      bulkUpdateResponseSchema
    );
  }

  static async bulkMoveTubes(moves: BulkMoveRequest['moves']): Promise<BulkMoveResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk-move`,
      { moves },
      bulkMoveResponseSchema
    );
  }

  static async bulkFetchTubes(tubeIds: string[]): Promise<TubeData[]> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk-fetch`,
      { tubeIds },
      bulkFetchResponseSchema
    );
  }

  // Tube locking

  static async lockTubes(request: LockTubesRequest): Promise<BulkLockResult> {
    return await httpClient.postData(`${this.BASE_PATH}/lock`, request, bulkLockResultSchema);
  }

  static async unlockTubes(request: UnlockTubesRequest): Promise<BulkUnlockResult> {
    return await httpClient.postData(`${this.BASE_PATH}/unlock`, request, bulkUnlockResultSchema);
  }

  static async shareTubeAccess(request: ShareTubeAccessRequest): Promise<ShareAccessResult> {
    return await httpClient.postData(
      `${this.BASE_PATH}/share-access`,
      request,
      shareAccessResultSchema
    );
  }

  static async revokeTubeAccess(request: RevokeTubeAccessRequest): Promise<RevokeAccessResult> {
    return await httpClient.postData(
      `${this.BASE_PATH}/revoke-access`,
      request,
      revokeAccessResultSchema
    );
  }
}
