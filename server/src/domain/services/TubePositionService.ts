/**
 * Tube Position Validation and Placement
 *
 * Validates tube placement against equipment configuration, position conflicts, and business rules.
 */

import type { Storage } from '@domain/entities/Storage';
import type { Tube } from '@domain/entities/Tube';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type {
  PositionValidation,
  PositionValidationWithWarnings,
  PositionValidationResult,
} from '@domain/types/services';
import { Location } from '@domain/value-objects/Location';

export class TubePositionService {
  constructor(
    private tubeRepository: TubeRepository,
    private storageRepository: StorageRepository
  ) {}

  // POSITION VALIDATION

  async canPlaceTubeAt(
    location: Location,
    labId: string,
    excludeTubeId?: string
  ): Promise<PositionValidationResult> {
    const result: PositionValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const configurationValid = await this.validateEquipmentConfiguration(location, labId);
    if (!configurationValid.isValid) {
      result.isValid = false;
      result.errors.push(...configurationValid.errors);
      return result;
    }

    const conflictCheck = await this.checkPositionConflicts(location, labId, excludeTubeId);
    if (!conflictCheck.isValid) {
      result.isValid = false;
      result.errors.push(...conflictCheck.errors);
      result.conflictingTube = conflictCheck.conflictingTube;
    }

    const businessRuleCheck = await this.applyPositionBusinessRules(location, labId);
    if (!businessRuleCheck.isValid) {
      result.isValid = false;
      result.errors.push(...businessRuleCheck.errors);
    }

    if (businessRuleCheck.warnings) {
      result.warnings?.push(...businessRuleCheck.warnings);
    }

    return result;
  }

  async validateEquipmentConfiguration(
    location: Location,
    labId: string
  ): Promise<PositionValidation> {
    const result: PositionValidation = { isValid: true, errors: [] };

    try {
      const isValid = await this.storageRepository.isLocationValid(labId, location);

      if (!isValid) {
        result.isValid = false;
        result.errors.push(
          `Location ${location.toString()} does not exist in equipment configuration`
        );

        const tankExists = await this.storageRepository.tankExists(labId, location.tankId);
        if (!tankExists) {
          result.errors.push(`Tank '${location.tankId}' does not exist`);
        } else {
          const rackExists = await this.storageRepository.rackExists(
            labId,
            location.tankId,
            location.rackId
          );
          if (!rackExists) {
            result.errors.push(
              `Rack ${location.rackId} does not exist in tank '${location.tankId}'`
            );
          } else {
            const boxExists = await this.storageRepository.boxExists(
              labId,
              location.tankId,
              location.rackId,
              location.boxId
            );
            if (!boxExists) {
              result.errors.push(
                `Box '${location.boxId}' does not exist in rack ${location.rackId} of tank '${location.tankId}'`
              );
            } else {
              const maxPosition = await this.storageRepository.getMaxPosition(
                labId,
                location.tankId,
                location.rackId,
                location.boxId
              );
              if (location.position > maxPosition) {
                result.errors.push(
                  `Position ${location.position} exceeds maximum position ${maxPosition} for this box`
                );
              }
            }
          }
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Unable to validate equipment configuration');
    }

    return result;
  }

  async checkPositionConflicts(
    location: Location,
    labId: string,
    excludeTubeId?: string
  ): Promise<ConflictCheckResult> {
    const result: ConflictCheckResult = { isValid: true, errors: [] };

    try {
      const existingTube = await this.tubeRepository.findByLocation(location, labId);

      if (existingTube && existingTube.id !== excludeTubeId) {
        result.isValid = false;
        result.conflictingTube = existingTube;
        result.errors.push(
          `Position ${location.toString()} is already occupied by tube ${existingTube.id}` +
            (existingTube.sample.cellType ? ` (${existingTube.sample.cellType})` : '') +
            (existingTube.researcherId ? ` - researcher:${existingTube.researcherId}` : '')
        );
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Unable to check for position conflicts');
    }

    return result;
  }

  async applyPositionBusinessRules(
    location: Location,
    labId: string
  ): Promise<PositionValidationWithWarnings> {
    const result: PositionValidationWithWarnings = { isValid: true, errors: [], warnings: [] };

    try {
      const occupiedPositions = await this.tubeRepository.getOccupiedPositions(
        location.tankId,
        location.rackId,
        location.boxId,
        labId
      );

      const maxPosition = await this.storageRepository.getMaxPosition(
        labId,
        location.tankId,
        location.rackId,
        location.boxId
      );

      const occupancyRate = occupiedPositions.length / maxPosition;

      if (occupancyRate > 0.9) {
        result.warnings?.push(
          `Box ${location.boxId} is ${Math.round(occupancyRate * 100)}% full. Consider using a different box.`
        );
      }

      const nearbyTubes = await this.getNearbyTubes(location, labId);
      const researchers = new Set(nearbyTubes.map(tube => tube.researcherId).filter(r => r));
      if (researchers.size === 1 && nearbyTubes.length > 0) {
        const researcherId = Array.from(researchers)[0];
        result.warnings?.push(
          `Adjacent tubes belong to researcher ${researcherId}. Consider consistency.`
        );
      }
    } catch (error) {
      result.warnings?.push('Unable to apply some position business rules');
    }

    return result;
  }

  // POSITION ANALYSIS

  private async getNearbyTubes(location: Location, labId: string): Promise<Tube[]> {
    try {
      const allTubesInBox = await this.tubeRepository.findByRackAndBox(
        location.rackId,
        location.boxId,
        labId
      );

      const nearbyTubes = allTubesInBox.filter(tube => {
        const distance = Math.abs(tube.location.position - location.position);
        // Within 10 positions — a single box row in most grid configurations
        return distance <= 10 && tube.location.tankId === location.tankId;
      });

      return nearbyTubes;
    } catch (error) {
      return [];
    }
  }

  validatePositionBulk(
    positions: Array<{ tankId: string; rackId: string; boxId: string; position: number }>,
    preloadedData: {
      config: Storage;
      occupiedPositions: Set<number>;
      maxPosition: number;
      tubesInBox: Tube[];
    }
  ): Map<number, { isValid: boolean; reason?: string }> {
    const results = new Map<number, { isValid: boolean; reason?: string }>();

    if (positions.length === 0) return results;

    const { tankId, rackId, boxId } = positions[0];
    const boxInfo = preloadedData.config.getBox(tankId, rackId, boxId);
    if (!boxInfo) {
      const reason = `Location ${tankId}-${rackId}-${boxId} does not exist in equipment configuration`;
      for (const pos of positions) {
        results.set(pos.position, { isValid: false, reason });
      }
      return results;
    }

    const claimedInBulk = new Set<number>();

    for (const pos of positions) {
      if (pos.position > preloadedData.maxPosition) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} exceeds box capacity of ${preloadedData.maxPosition}`,
        });
        continue;
      }

      if (preloadedData.occupiedPositions.has(pos.position)) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} is already occupied`,
        });
        continue;
      }

      if (claimedInBulk.has(pos.position)) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} is claimed by another tube in this bulk operation`,
        });
        continue;
      }

      claimedInBulk.add(pos.position);
      results.set(pos.position, { isValid: true });
    }

    const totalOccupied = preloadedData.occupiedPositions.size + claimedInBulk.size;
    const occupancyRate = totalOccupied / preloadedData.maxPosition;
    if (occupancyRate > 0.9) {
      for (const [position, result] of results) {
        if (result.isValid) {
          results.set(position, {
            isValid: true,
            reason: `Warning: Box ${boxId} will be ${Math.round(occupancyRate * 100)}% full after this bulk operation`,
          });
        }
      }
    }

    return results;
  }

  async validatePosition(
    tankId: string,
    rackId: string,
    boxId: string,
    position: number,
    excludeTubeId: string | undefined,
    labId: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    const location = Location.create(tankId, rackId, boxId, position);
    const result = await this.canPlaceTubeAt(location, labId, excludeTubeId);

    if (result.isValid) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        reason: result.errors.join('; '),
      };
    }
  }
}

// TYPES AND INTERFACES

interface ConflictCheckResult extends PositionValidation {
  conflictingTube?: Tube;
}
