/**
 * Researcher Data Service
 *
 * HTTP operations for researcher filtered listing.
 */

import {
  type Researcher,
  type AdminResearcher,
  type ResearcherQueryFilters,
  researcherSchema,
  adminResearcherSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

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
}
