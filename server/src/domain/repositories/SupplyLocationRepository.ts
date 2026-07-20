/**
 * Supply Location Repository Interface
 *
 * Data access contract for named storage zones where supplies are kept.
 */

import type { SupplyLocation } from '@domain/entities/SupplyLocation';

export interface SupplyLocationRepository {
  findById(id: string, labId: string): Promise<SupplyLocation | null>;
  findByLabId(labId: string): Promise<SupplyLocation[]>;
  save(location: SupplyLocation): Promise<void>;
}
