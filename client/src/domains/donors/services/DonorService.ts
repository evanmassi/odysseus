/**
 * Donor Data Service
 *
 * HTTP operations for donor registry CRUD, search, and collection history.
 */

import {
  type DonorWithTubeCount,
  type DonorCollectionHistory,
  type DonorSearchResult,
  type CreateDonorRequest,
  type UpdateDonorRequest,
  type CreateCollectionHistoryRequest,
  type UpdateCollectionHistoryRequest,
  donorsResponseSchema,
  donorResponseSchema,
  donorCollectionHistoryResponseSchema,
  donorCollectionHistoryEntryResponseSchema,
  donorSearchResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class DonorService {
  private static readonly BASE_PATH = '/donors';

  static async list(): Promise<DonorWithTubeCount[]> {
    const response = await httpClient.getData(this.BASE_PATH, donorsResponseSchema);
    return response.donors;
  }

  static async search(query: string, limit?: number): Promise<DonorSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));

    const response = await httpClient.getData(
      `${this.BASE_PATH}/search?${params.toString()}`,
      donorSearchResponseSchema
    );
    return response.results;
  }

  static async getCollectionHistory(donorId: string): Promise<DonorCollectionHistory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/${donorId}/collection-history`,
      donorCollectionHistoryResponseSchema
    );
    return response.history;
  }

  static async create(data: CreateDonorRequest): Promise<DonorWithTubeCount> {
    const response = await httpClient.postData(this.BASE_PATH, data, donorResponseSchema);
    return response.donor;
  }

  static async update(id: string, data: UpdateDonorRequest): Promise<DonorWithTubeCount> {
    const response = await httpClient.putData(`${this.BASE_PATH}/${id}`, data, donorResponseSchema);
    return response.donor;
  }

  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  static async addCollectionHistory(
    donorId: string,
    data: CreateCollectionHistoryRequest
  ): Promise<DonorCollectionHistory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${donorId}/collection-history`,
      data,
      donorCollectionHistoryEntryResponseSchema
    );
    return response.entry;
  }

  static async updateCollectionHistory(
    historyId: string,
    data: UpdateCollectionHistoryRequest
  ): Promise<DonorCollectionHistory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/collection-history/${historyId}`,
      data,
      donorCollectionHistoryEntryResponseSchema
    );
    return response.entry;
  }

  static async deleteCollectionHistory(historyId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/collection-history/${historyId}`);
  }
}
