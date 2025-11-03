/**
 * ResearcherService - Centralized researcher data operations
 * 
 * Industry-standard domain service pattern using typed httpClient helpers.
 * All envelope handling done at transport layer, this service works with clean types.
 */

import { httpClient } from '@infra/api/httpClient';
import { z } from 'zod';
import {
  type Researcher,
  type CreateResearcherProfile,
  type UpdateResearcherProfile,
  type ResearcherQueryFilters,
  researcherSchema,
  createResearcherProfileSchema,
  updateResearcherProfileSchema
} from '@odysseus/shared-schemas';

export class ResearcherService {
  private static readonly BASE_PATH = '/researchers';

  /**
   * Fetch all researchers with optional filters
   */
  static async list(filters?: ResearcherQueryFilters): Promise<Researcher[]> {
    const queryParams = filters ? new URLSearchParams({
      ...filters.active !== undefined && { active: String(filters.active) },
      ...filters.department && { department: filters.department },
      ...filters.search && { search: filters.search },
      ...filters.limit && { limit: String(filters.limit) },
      ...filters.offset && { offset: String(filters.offset) },
      ...filters.sortBy && { sortBy: filters.sortBy },
      ...filters.sortOrder && { sortOrder: filters.sortOrder }
    }) : null;

    const url = queryParams ? `${this.BASE_PATH}?${queryParams}` : this.BASE_PATH;

    return await httpClient.getArray(url, researcherSchema);
  }

  /**
   * Fetch single researcher by ID
   */
  static async get(id: string): Promise<Researcher> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, researcherSchema);
  }

  /**
   * Create new researcher
   */
  static async create(data: CreateResearcherProfile): Promise<Researcher> {
    const validated = createResearcherProfileSchema.parse(data);
    return await httpClient.postData(this.BASE_PATH, validated, researcherSchema);
  }

  /**
   * Update researcher
   */
  static async update(id: string, data: UpdateResearcherProfile): Promise<Researcher> {
    const validated = updateResearcherProfileSchema.parse(data);
    return await httpClient.putData(`${this.BASE_PATH}/${id}`, validated, researcherSchema);
  }

  /**
   * Delete researcher
   */
  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Get tube count for a researcher
   */
  static async getTubeCount(id: string): Promise<number> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/${id}/tubes/count`,
      z.object({ tubeCount: z.number() })
    );
    return response.tubeCount;
  }
}
