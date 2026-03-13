/**
 * Lab Repository Interface
 *
 * Data access contract for lab tenant management.
 */

import type { Lab } from '@domain/entities/Lab';

export interface LabRepository {
  findById(id: string): Promise<Lab | null>;
  findBySlug(slug: string): Promise<Lab | null>;
  findAll(): Promise<Lab[]>;
  findActive(): Promise<Lab[]>;
  save(lab: Lab): Promise<void>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}
