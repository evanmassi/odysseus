/**
 * Location Repository Interface
 *
 * Data access contract for the lab-wide location tree shared by every catalog.
 */

import type { Location } from '@domain/entities/Location';

export interface LocationRepository {
  findById(id: string, labId: string): Promise<Location | null>;
  findByLabId(labId: string): Promise<Location[]>;
  save(location: Location): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;

  hasChildren(id: string, labId: string): Promise<boolean>;
  isInUseIncludingChildren(id: string, labId: string): Promise<boolean>;
}
