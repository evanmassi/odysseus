/**
 * TubeService
 *
 * Type-safe tube data operations with Zod validation.
 */

import {
  type TubeData,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeQueryFilters,
  type LockTubesRequest,
  type UnlockTubesRequest,
  type ShareTubeAccessRequest,
  type RevokeTubeAccessRequest,
  type BatchLockResult,
  type BatchUnlockResult,
  type ShareAccessResult,
  type RevokeAccessResult,
  tubeDataSchema,
  createTubeRequestSchema,
  updateTubeRequestSchema,
  batchLockResultSchema,
  batchUnlockResultSchema,
  shareAccessResultSchema,
  revokeAccessResultSchema,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api/httpClient';
import { normalizeDateString } from '@shared/utils/dateUtils';

/**
 * Core tube data operations service
 */
export class TubeService {
  private static readonly BASE_PATH = '/tubes';

  /**
   * Normalize date fields in tube request data
   * Ensures all dates are in YYYY-MM-DD format to prevent timezone bugs
   * @private
   */
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

  /**
   * Fetch all tubes with optional filtering
   */
  static async fetchTubes(filters?: TubeQueryFilters): Promise<TubeData[]> {
    const queryParams = filters
      ? new URLSearchParams({
          ...(filters.tankId && { tankId: filters.tankId }),
          ...(filters.rackId && { rackId: filters.rackId }),
          ...(filters.boxId && { boxId: filters.boxId }),
          ...(filters.researcherId && { researcherId: filters.researcherId }),
          ...(filters.cellType && { cellType: filters.cellType }),
          ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
          ...(filters.dateTo && { dateTo: filters.dateTo }),
        })
      : null;

    const url = queryParams ? `${this.BASE_PATH}?${queryParams.toString()}` : this.BASE_PATH;

    return await httpClient.getArray(url, tubeDataSchema);
  }

  /**
   * Fetch a single tube by ID
   */
  static async fetchTubeById(id: string): Promise<TubeData> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, tubeDataSchema);
  }

  /**
   * Create a new tube
   */
  static async createTube(tubeData: CreateTubeRequest): Promise<TubeData> {
    // Normalize dates to YYYY-MM-DD format to prevent timezone bugs
    const normalized = this.normalizeTubeDates(tubeData);
    const validatedRequest = createTubeRequestSchema.parse(normalized);
    return await httpClient.postData(this.BASE_PATH, validatedRequest, tubeDataSchema);
  }

  /**
   * Update an existing tube
   */
  static async updateTube(id: string, updates: UpdateTubeRequest): Promise<TubeData> {
    // Normalize dates to YYYY-MM-DD format to prevent timezone bugs
    const normalized = this.normalizeTubeDates(updates);
    const validatedUpdates = updateTubeRequestSchema.parse(normalized);
    return await httpClient.putData(`${this.BASE_PATH}/${id}`, validatedUpdates, tubeDataSchema);
  }

  /**
   * Delete a tube by ID
   */
  static async deleteTube(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Bulk delete tubes - single request to server
   */
  static async bulkDeleteTubes(tubeIds: string[]): Promise<{
    success: boolean;
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await httpClient.post<{
      success: boolean;
      data: {
        success: boolean;
        deleted: string[];
        failed: Array<{ id: string; error: string }>;
      };
    }>('/tubes/bulk-delete', { tubeIds });

    return response.data.data;
  }

  /**
   * Fetch tubes by specific location
   */
  static async fetchTubesByLocation(
    tankId: string,
    rackId: string,
    boxId: string
  ): Promise<TubeData[]> {
    const queryParams = new URLSearchParams({ tankId, rackId, boxId });
    return await httpClient.getArray(`/tubes/location?${queryParams.toString()}`, tubeDataSchema);
  }

  /**
   * Search tubes by query string
   */
  static async searchTubes(
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TubeData[]> {
    const queryParams = new URLSearchParams({ query });

    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    if (options?.offset) {
      queryParams.append('offset', options.offset.toString());
    }

    return await httpClient.getArray(`/tubes/search?${queryParams.toString()}`, tubeDataSchema);
  }

  /**
   * Bulk paste tubes - create tubes at target positions.
   * Returns partial success info so caller can handle failures gracefully.
   */
  static async pasteTubes(tubes: CreateTubeRequest[]): Promise<{
    success: boolean;
    created: TubeData[];
    failed: Array<{ index: number; request: CreateTubeRequest; error: string }>;
  }> {
    // Normalize dates to YYYY-MM-DD format to prevent timezone bugs
    const normalizedTubes = tubes.map(tube => this.normalizeTubeDates(tube));
    const validatedRequests = normalizedTubes.map(tube => createTubeRequestSchema.parse(tube));

    const response = await httpClient.post<{
      success: boolean;
      data: {
        success: boolean;
        created: TubeData[];
        failed: Array<{ index: number; request: CreateTubeRequest; error: string }>;
      };
    }>(this.BASE_PATH, validatedRequests);

    return response.data.data;
  }

  /**
   * Bulk update tubes - update multiple tubes at once
   *
   * Uses server-side bulk update endpoint for proper audit logging.
   */
  static async bulkUpdateTubes(updates: Array<{ id: string; data: UpdateTubeRequest }>): Promise<{
    success: boolean;
    updated: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    // Normalize dates to YYYY-MM-DD format to prevent timezone bugs
    const normalizedUpdates = updates.map(update => ({
      id: update.id,
      updates: this.normalizeTubeDates(update.data),
    }));

    const response = await httpClient.post<{
      success: boolean;
      data: {
        success: boolean;
        updated: string[];
        failed: Array<{ id: string; error: string }>;
      };
    }>('/tubes/bulk-update', { updates: normalizedUpdates });

    return response.data.data;
  }

  // ============================================
  // TUBE LOCKING METHODS
  // ============================================

  /**
   * Lock tubes
   * Batch lock with partial success pattern
   */
  static async lockTubes(request: LockTubesRequest): Promise<BatchLockResult> {
    return await httpClient.postData(`${this.BASE_PATH}/lock`, request, batchLockResultSchema);
  }

  /**
   * Unlock tubes
   * Batch unlock with partial success pattern
   */
  static async unlockTubes(request: UnlockTubesRequest): Promise<BatchUnlockResult> {
    return await httpClient.postData(`${this.BASE_PATH}/unlock`, request, batchUnlockResultSchema);
  }

  /**
   * Share tube access with other users
   * Batch share with partial success pattern
   */
  static async shareTubeAccess(request: ShareTubeAccessRequest): Promise<ShareAccessResult> {
    return await httpClient.postData(
      `${this.BASE_PATH}/share-access`,
      request,
      shareAccessResultSchema
    );
  }

  /**
   * Revoke tube access from users
   * Batch revoke with partial success pattern
   */
  static async revokeTubeAccess(request: RevokeTubeAccessRequest): Promise<RevokeAccessResult> {
    return await httpClient.postData(
      `${this.BASE_PATH}/revoke-access`,
      request,
      revokeAccessResultSchema
    );
  }

  /** Fetches pre-computed statistics from server instead of downloading all tubes. */
  static async fetchStats(): Promise<TubeStats> {
    return await httpClient.getData(`${this.BASE_PATH}/stats`, tubeStatsSchema);
  }
}

/**
 * Tube statistics response schema
 */
const tubeStatsSchema = z.object({
  totalTubes: z.number(),
  tubesByTank: z.record(z.string(), z.number()),
  tubesByResearcher: z.record(z.string(), z.number()),
  averageTubesPerBox: z.number(),
  oldestTube: z
    .object({
      id: z.string(),
      createdAt: z.string(),
    })
    .optional(),
  newestTube: z
    .object({
      id: z.string(),
      createdAt: z.string(),
    })
    .optional(),
  completionRate: z.number(),
  expirationRate: z.number(),
});

export type TubeStats = z.infer<typeof tubeStatsSchema>;
