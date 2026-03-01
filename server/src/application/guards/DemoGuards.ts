/**
 * Demo Seed Guards
 *
 * Centralized guard functions for demo lab seeded infrastructure protection.
 * All guards short-circuit for non-demo users so they're no-ops for real labs.
 */

import { User } from '@domain/entities/User';
import { Lab } from '@domain/entities/Lab';
import { Configuration } from '@domain/entities/Configuration';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';

export function rejectIfSeeded(
  user: User,
  config: Configuration,
  tankId: string,
  rackId?: string,
  boxId?: string
): void {
  if (!user.isDemo) return;
  if (config.isResourceSeeded(tankId, rackId, boxId)) {
    throw new PermissionError('Cannot modify seeded demo infrastructure');
  }
}

export function enforceAddTankLimit(
  user: User,
  config: Configuration,
  lab: Lab
): void {
  if (!user.isDemo) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const nonSeededCount = config.countNonSeededTanks();
  if (nonSeededCount >= limits.maxTanks) {
    throw new ValidationError(`Demo limit reached: maximum ${limits.maxTanks} additional tanks allowed`);
  }
}

export function enforceAddRacksLimit(
  user: User,
  config: Configuration,
  lab: Lab,
  tankId: string,
  count: number
): void {
  if (!user.isDemo) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const nonSeededCount = config.countNonSeededRacksInTank(tankId);
  if (nonSeededCount + count > limits.maxRacksPerTank) {
    throw new ValidationError(`Demo limit reached: maximum ${limits.maxRacksPerTank} additional racks per tank allowed`);
  }
}

export function enforceAddBoxesLimit(
  user: User,
  config: Configuration,
  lab: Lab,
  tankId: string,
  rackId: string,
  count: number
): void {
  if (!user.isDemo) return;
  const limits = lab.demoLimits ?? DEMO_LIMITS_DEFAULTS;
  const nonSeededCount = config.countNonSeededBoxesInRack(tankId, rackId);
  if (nonSeededCount + count > limits.maxBoxesPerRack) {
    throw new ValidationError(`Demo limit reached: maximum ${limits.maxBoxesPerRack} additional boxes per rack allowed`);
  }
}

export function rejectDemoConfigOperation(
  user: User,
  operation: string
): void {
  if (!user.isDemo) return;
  throw new PermissionError(`${operation} is not allowed in the demo environment`);
}
