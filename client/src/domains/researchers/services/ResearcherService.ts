/**
 * Researcher Data Service
 *
 * HTTP read operations for researcher lists.
 */

import { type Researcher, researcherSchema } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class ResearcherService {
  private static readonly BASE_PATH = '/researchers';

  /** `visible: true` restricts to approved+active researchers (for dropdowns). */
  static async list(options?: { visible?: boolean }): Promise<Researcher[]> {
    const { visible = false } = options ?? {};

    const url = visible ? `${this.BASE_PATH}?visible=true` : this.BASE_PATH;

    return await httpClient.getArray(url, researcherSchema);
  }
}
