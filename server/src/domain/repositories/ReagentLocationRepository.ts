/**
 * Reagent Location Repository Interface
 *
 * Data access contract for named storage zones where reagents are kept.
 */

import type { ReagentLocation } from '@domain/entities/ReagentLocation';

export interface ReagentLocationRepository {
  findById(id: string, labId: string): Promise<ReagentLocation | null>;
  findByLabId(labId: string): Promise<ReagentLocation[]>;
  save(location: ReagentLocation): Promise<void>;
}
