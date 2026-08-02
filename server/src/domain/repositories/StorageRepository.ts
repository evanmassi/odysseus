/**
 * Storage Repository Interface
 *
 * Data access contract for lab-scoped storage equipment configuration with versioning.
 */

import type { Storage } from '@domain/entities/Storage';
import type { TubeLocation } from '@domain/value-objects/TubeLocation';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';

export interface StorageRepository {
  getForLab(labId: string): Promise<Storage | null>;
  getForLabs(labIds: string[]): Promise<Map<string, Storage>>;
  ensureDefaultForLab(labId: string): Promise<Storage>;

  getByVersion(labId: string, version: number): Promise<Storage | null>;
  getHistory(labId: string, limit?: number): Promise<StorageHistory[]>;

  /** Save with optimistic locking. @throws ConflictError if version mismatch. */
  saveWithOptimisticLock(
    labId: string,
    storage: Storage,
    expectedVersion: number,
    changeDescription?: string,
    changedBy?: string
  ): Promise<number>;

  /**
   * Atomically delete tank/rack/box if empty. Uses SERIALIZABLE isolation
   * to prevent TOCTOU race conditions where tubes could be orphaned.
   * @throws ValidationError if tubes exist in the equipment
   * @throws NotFoundError if equipment doesn't exist
   */
  deleteEmptyTank(labId: string, tankId: string, changedBy: string): Promise<{ tankName: string }>;

  deleteEmptyRack(
    labId: string,
    tankId: string,
    rackId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string }>;

  deleteEmptyBox(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string; boxName: string }>;

  isLocationValid(labId: string, location: TubeLocation): Promise<boolean>;
  tankExists(labId: string, tankId: string): Promise<boolean>;
  rackExists(labId: string, tankId: string, rackId: string): Promise<boolean>;
  boxExists(labId: string, tankId: string, rackId: string, boxId: string): Promise<boolean>;

  getMaxPosition(labId: string, tankId: string, rackId: string, boxId: string): Promise<number>;

  isHealthy(): Promise<boolean>;

  getSecurityConfig(): Promise<SecurityConfig>;
  updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<SecurityConfig>;
  getSystemMetrics(labId: string): Promise<SystemMetrics>;
}

export interface StorageHistory {
  version: number;
  timestamp: Date;
  changeDescription?: string;
  changedBy?: string;
  storage: Storage;
}
