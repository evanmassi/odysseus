/**
 * Researcher Data Service
 *
 * HTTP operations for researcher CRUD and filtered listing.
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
   * - admin: true → AdminResearcher[] (with tubeCount, linkedUserId, linkedUsername)
   * - visible: true → approved+active researchers only (for dropdowns)
   * - default → Researcher[] (basic fields)
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

    if (admin) {
      queryParams.set('admin', 'true');
    }

    if (visible) {
      queryParams.set('visible', 'true');
    }

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

    const schema = admin ? adminResearcherSchema : researcherSchema;

    return await httpClient.getArray(url, schema);
  }

  static async get(id: string): Promise<AdminResearcher> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, adminResearcherSchema);
  }

  static async create(data: CreateResearcherProfile): Promise<AdminResearcher> {
    const validated = createResearcherProfileSchema.parse(data);
    return await httpClient.postData(this.BASE_PATH, validated, adminResearcherSchema);
  }

  static async update(id: string, data: UpdateResearcherProfile): Promise<AdminResearcher> {
    const validated = updateResearcherProfileSchema.parse(data);
    return await httpClient.putData(`${this.BASE_PATH}/${id}`, validated, adminResearcherSchema);
  }

  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }
}
