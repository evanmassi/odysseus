/**
 * Researcher Repository Interface
 *
 * Data access contract for researcher records and tube assignment queries.
 */

import type { Researcher } from '@domain/entities/Researcher';

export interface ResearcherRepository {
  /** Lab-scoped lookup — the default. Returns null for a researcher in another lab. */
  findById(id: string, labId: string): Promise<Researcher | null>;

  /** Cross-lab lookup for system-admin paths only. Prefer findById. */
  findByIdAnyLab(id: string): Promise<Researcher | null>;

  findByPersonId(personId: string): Promise<Researcher | null>;
  findByLabId(labId: string): Promise<Researcher[]>;
  findActiveByLabId(labId: string): Promise<Researcher[]>;

  /** Returns only found researchers in the lab — no errors for missing IDs. */
  findByIds(ids: string[], labId: string): Promise<Researcher[]>;

  /** Create vs update determined by existence. */
  save(researcher: Researcher): Promise<void>;

  delete(id: string, labId: string): Promise<boolean>;

  nameExists(firstName: string, lastName: string, labId?: string): Promise<boolean>;
  findDeactivatedByName(
    firstName: string,
    lastName: string,
    labId: string
  ): Promise<Researcher | null>;

  countByLabIds(labIds: string[]): Promise<Map<string, number>>;
  getTubeCountByResearcher(researcherId: string): Promise<number>;
  getTubeCountsByResearcherIds(researcherIds: string[]): Promise<Map<string, number>>;

  isHealthy(): Promise<boolean>;
}
