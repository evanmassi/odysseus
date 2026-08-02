/**
 * Lab Location Repository Interface
 *
 * Data access contract for the lab-wide location tree shared by every catalog.
 */

import type { LabLocation } from '@domain/entities/LabLocation';

export interface LabLocationRepository {
  findById(id: string, labId: string): Promise<LabLocation | null>;
  findByLabId(labId: string): Promise<LabLocation[]>;
  save(location: LabLocation): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  hasChildren(id: string, labId: string): Promise<boolean>;
  isInUseIncludingChildren(id: string, labId: string): Promise<boolean>;
}
