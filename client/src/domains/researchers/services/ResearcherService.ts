/**
 * ResearcherService
 *
 * Researcher data operations using typed httpClient helpers.
 */

import {
  type Researcher,
  type AdminResearcher,
  type CreateResearcherProfile,
  type UpdateResearcherProfile,
  type ResearcherQueryFilters,
  researcherSchema,
  adminResearcherSchema,
  createResearcherProfileSchema,
  updateResearcherProfileSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api/httpClient';

export class ResearcherService {
  private static readonly BASE_PATH = '/researchers';

  /**
   * Fetch all researchers with optional filters
   * TypeScript overloads for type safety:
   * - admin: true → returns AdminResearcher[] (with tubeCount, linkedUserId, linkedUsername)
   * - visible: true → returns only approved+active researchers (for dropdowns)
   * - admin: false/undefined → returns Researcher[] (basic fields only)
   */
  static async list(options: {
    admin: true;
    filters?: ResearcherQueryFilters;
  }): Promise<AdminResearcher[]>;
  static async list(options?: {
    admin?: false;
    visible?: boolean;
    filters?: ResearcherQueryFilters;
  }): Promise<Researcher[]>;
  static async list(options?: {
    admin?: boolean;
    visible?: boolean;
    filters?: ResearcherQueryFilters;
  }): Promise<Researcher[] | AdminResearcher[]> {
    const { admin = false, visible = false, filters } = options ?? {};

    const queryParams = new URLSearchParams();

    // Add admin flag if requested
    if (admin) {
      queryParams.set('admin', 'true');
    }

    // Add visible flag for dropdown filtering (approved + active only)
    if (visible) {
      queryParams.set('visible', 'true');
    }

    // Add filters
    if (filters) {
      if (filters.active !== undefined) queryParams.set('active', String(filters.active));
      if (filters.department) queryParams.set('department', filters.department);
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.limit) queryParams.set('limit', String(filters.limit));
      if (filters.offset) queryParams.set('offset', String(filters.offset));
      if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
    }

    const queryString = queryParams.toString();
    const url = queryString ? `${this.BASE_PATH}?${queryString}` : this.BASE_PATH;

    // Use appropriate schema based on admin flag
    const schema = admin ? adminResearcherSchema : researcherSchema;

    return await httpClient.getArray(url, schema);
  }

  /**
   * Fetch single researcher by ID
   */
  static async get(id: string): Promise<AdminResearcher> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, adminResearcherSchema);
  }

  /**
   * Create new researcher
   */
  static async create(data: CreateResearcherProfile): Promise<AdminResearcher> {
    const validated = createResearcherProfileSchema.parse(data);
    return await httpClient.postData(this.BASE_PATH, validated, adminResearcherSchema);
  }

  /**
   * Update researcher
   */
  static async update(id: string, data: UpdateResearcherProfile): Promise<AdminResearcher> {
    const validated = updateResearcherProfileSchema.parse(data);
    return await httpClient.putData(`${this.BASE_PATH}/${id}`, validated, adminResearcherSchema);
  }

  /**
   * Delete researcher
   */
  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }
}
