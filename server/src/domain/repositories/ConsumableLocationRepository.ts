/**
 * Consumable Location Repository Interface
 *
 * Data access contract for named storage zones where consumables are kept.
 */

import type { ConsumableLocation } from '@domain/entities/ConsumableLocation';

export interface ConsumableLocationRepository {
  findById(id: string, labId: string): Promise<ConsumableLocation | null>;
  findByLabId(labId: string): Promise<ConsumableLocation[]>;
  save(location: ConsumableLocation): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasStock(id: string): Promise<boolean>;
}
