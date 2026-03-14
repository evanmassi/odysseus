/**
 * Researcher Repository Interface
 *
 * Data access contract for researcher records and tube assignment queries.
 */

import type { Researcher } from '@domain/entities/Researcher';

export interface ResearcherRepository {

  // BASIC CRUD OPERATIONS

  findById(id: string): Promise<Researcher | null>;
  findByPersonId(personId: string): Promise<Researcher | null>;
  findByLabId(labId: string): Promise<Researcher[]>;
  findActiveByLabId(labId: string): Promise<Researcher[]>;

  /** Returns only found researchers — no errors for missing IDs. */
  findByIds(ids: string[]): Promise<Researcher[]>;

  /** Create vs update determined by existence. */
  save(researcher: Researcher): Promise<void>;

  delete(id: string): Promise<boolean>;

  // QUERY OPERATIONS

  nameExists(firstName: string, lastName: string, labId?: string): Promise<boolean>;
  searchByName(namePattern: string, labId: string): Promise<Researcher[]>;

  // INTEGRATION QUERIES

  getMostActiveResearchers(limit: number | undefined, labId: string): Promise<Array<{ researcher: Researcher, tubeCount: number }>>;
  getTubeCountByResearcher(researcherId: string): Promise<number>;
  getTubeCountsByResearcherIds(researcherIds: string[]): Promise<Map<string, number>>;

  // MAINTENANCE

  isHealthy(): Promise<boolean>;
}
