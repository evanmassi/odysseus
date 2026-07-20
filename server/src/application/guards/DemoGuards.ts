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

export function rejectDemoConfigOperation(user: User, operation: string): void {
  if (!user.isDemo) return;
  throw new PermissionError(`${operation} is not allowed in the demo environment`);
}

export function rejectDemoManagementOperation(user: User, subject: string): void {
  if (!user.isDemo) return;
  throw new PermissionError(`${subject} is restricted in the demo environment`);
}
