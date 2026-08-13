/**
 * Demo Seed Guards
 *
 * Centralized guard functions for demo lab seeded infrastructure protection.
 * All guards short-circuit for non-demo users so they're no-ops for real labs.
 */

import { DEMO_LIMITS_DEFAULTS, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

import type { Lab } from '@domain/entities/Lab';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { StorageRepository } from '@domain/repositories/StorageRepository';

export function rejectIfSeeded(
  user: User,
  config: Storage,
  tankId: string,
  rackId?: string,
  boxId?: string
): void {
  if (!user.isDemo) return;
  if (config.isResourceSeeded(tankId, rackId, boxId)) {
    throw new PermissionError('Cannot modify seeded demo infrastructure');
  }
}

export function enforceAddTankLimit(user: User, config: Storage, lab: Lab): void {
  if (!user.isDemo) return;
  if (!config.hasAnySeededResources()) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const nonSeededCount = config.countNonSeededTanks();
  if (nonSeededCount >= limits.maxTanks) {
    throw new ValidationError(
      `Demo limit reached: maximum ${limits.maxTanks} additional tanks allowed`
    );
  }
}

export function enforceAddRacksLimit(
  user: User,
  config: Storage,
  lab: Lab,
  tankId: string,
  count: number
): void {
  if (!user.isDemo) return;
  if (!config.hasAnySeededResources()) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const tank = config.tanks.find(t => t.id === tankId);
  const nonSeededCount = config.countNonSeededRacksInTank(tankId);
  const baseline = tank && !tank.isSeeded ? 1 : 0;
  const extras = Math.max(0, nonSeededCount - baseline);
  if (extras + count > limits.maxRacksPerTank) {
    throw new ValidationError(
      `Demo limit reached: maximum ${limits.maxRacksPerTank} additional racks per tank allowed`
    );
  }
}

export function enforceAddBoxesLimit(
  user: User,
  config: Storage,
  lab: Lab,
  tankId: string,
  rackId: string,
  count: number
): void {
  if (!user.isDemo) return;
  if (!config.hasAnySeededResources()) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const tank = config.tanks.find(t => t.id === tankId);
  const rack = tank?.racks.find(r => r.id === rackId);
  const nonSeededCount = config.countNonSeededBoxesInRack(tankId, rackId);
  const baseline = rack && !rack.isSeeded ? EQUIPMENT_DEFAULTS.BOXES_PER_RACK : 0;
  const extras = Math.max(0, nonSeededCount - baseline);
  if (extras + count > limits.maxBoxesPerRack) {
    throw new ValidationError(
      `Demo limit reached: maximum ${limits.maxBoxesPerRack} additional boxes per rack allowed`
    );
  }
}

/**
 * Blocks destruction of records the demo dataset owns, leaving visitor-created ones alone.
 *
 * Structural parameter so one guard serves tubes, donors, all three catalogs, and their
 * transactions without merging those identities. `seededRecord` carries the flag and `label`
 * names what is being deleted — for child records (documents, barcodes, packaging levels) pass
 * the **parent item** as the flag source, since hollowing out a seeded item is the same loss.
 */
export function rejectSeededItemDeletion(
  user: User,
  seededRecord: { isSeeded?: boolean },
  label: string
): void {
  if (!user.isDemo) return;
  if (!seededRecord.isSeeded) return;
  throw new PermissionError(
    `This ${label} belongs to the demo dataset and can't be deleted. Create your own to try this out.`
  );
}

/**
 * Locks a seeded demo lab's shared vocabulary — categories, units, attributes, locations, lookup
 * values — for everyone but system admins. The records point at these, so letting a visitor rename
 * or delete one leaves the dataset incoherent; keeping them fixed is also what lets the nightly
 * reset upsert them rather than rebuild them.
 *
 * The only guard here that reaches a repository, and deliberately so: it settles the demo question
 * from the user alone and returns before any query, so real labs pay nothing for a demo feature.
 * Note the trigger is *storage* seeding — a demo lab whose tanks were never seeded stays unlocked.
 */
export async function rejectIfTaxonomyLocked(
  user: User,
  storageRepository: StorageRepository,
  labId: string,
  surface: string
): Promise<void> {
  if (user.isSystemAdmin()) return;
  if (!user.isDemo) return;

  const config = await storageRepository.getForLab(labId);
  if (config?.hasAnySeededResources()) {
    throw new PermissionError(
      `${surface} are fixed in the demo so the sample records stay coherent.`
    );
  }
}

export function rejectDemoConfigOperation(user: User, operation: string): void {
  if (!user.isDemo) return;
  throw new PermissionError(`${operation} is not allowed in the demo environment`);
}

export function rejectDemoManagementOperation(user: User, subject: string): void {
  if (!user.isDemo) return;
  throw new PermissionError(`${subject} is restricted in the demo environment`);
}
