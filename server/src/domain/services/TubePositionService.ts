import { Location } from '@domain/valueObjects/Location';
import { Tube } from '@domain/entities/Tube';
import { Configuration } from '@domain/entities/Configuration';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import type { PositionConflict } from '@domain/types/Position';
import type { PositionValidation, PositionValidationWithWarnings, PositionValidationResult, BoxStatistics } from '@domain/types/services';

/**
 * TubePositionService
 * 
 * Domain service that handles complex position validation and conflict detection
 * that involves multiple aggregates (Tube + Configuration).
 * 
 * This service encapsulates business rules that don't belong to a single entity:
 * - Position conflicts between tubes
 * - Equipment configuration validation
 * - Position availability calculations
 * - Move operation validation
 */
export class TubePositionService {
  
  constructor(
    private tubeRepository: TubeRepository,
    private configurationRepository: ConfigurationRepository
  ) {}

  // POSITION VALIDATION

  /**
   * Check if a tube can be placed at a specific location
   * This is the main business rule for tube placement
   */
  async canPlaceTubeAt(location: Location, excludeTubeId?: string): Promise<PositionValidationResult> {
    const result: PositionValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Validate equipment configuration exists
    const configurationValid = await this.validateEquipmentConfiguration(location);
    if (!configurationValid.isValid) {
      result.isValid = false;
      result.errors.push(...configurationValid.errors);
      return result; // No point checking further if equipment doesn't exist
    }

    // 2. Check for position conflicts
    const conflictCheck = await this.checkPositionConflicts(location, excludeTubeId);
    if (!conflictCheck.isValid) {
      result.isValid = false;
      result.errors.push(...conflictCheck.errors);
      result.conflictingTube = conflictCheck.conflictingTube;
    }

    // 3. Apply business rules for position placement
    const businessRuleCheck = await this.applyPositionBusinessRules(location);
    if (!businessRuleCheck.isValid) {
      result.isValid = false;
      result.errors.push(...businessRuleCheck.errors);
    }

    if (businessRuleCheck.warnings) {
      result.warnings?.push(...businessRuleCheck.warnings);
    }

    return result;
  }

  /**
   * Validate equipment configuration exists for this location
   */
  async validateEquipmentConfiguration(location: Location): Promise<PositionValidation> {
    const result: PositionValidation = { isValid: true, errors: [] };

    try {
      const isValid = await this.configurationRepository.isLocationValid(location);
      
      if (!isValid) {
        result.isValid = false;
        result.errors.push(`Location ${location.toString()} does not exist in equipment configuration`);
        
        // Provide more specific error information
        const tankExists = await this.configurationRepository.tankExists(location.tankId);
        if (!tankExists) {
          result.errors.push(`Tank '${location.tankId}' does not exist`);
        } else {
          const rackExists = await this.configurationRepository.rackExists(location.tankId, location.rackId);
          if (!rackExists) {
            result.errors.push(`Rack ${location.rackId} does not exist in tank '${location.tankId}'`);
          } else {
            const boxExists = await this.configurationRepository.boxExists(location.tankId, location.rackId, location.boxId);
            if (!boxExists) {
              result.errors.push(`Box '${location.boxId}' does not exist in rack ${location.rackId} of tank '${location.tankId}'`);
            } else {
              const maxPosition = await this.configurationRepository.getMaxPosition(location.tankId, location.rackId, location.boxId);
              if (location.position > maxPosition) {
                result.errors.push(`Position ${location.position} exceeds maximum position ${maxPosition} for this box`);
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

  /**
   * Check for conflicts with existing tubes
   */
  async checkPositionConflicts(location: Location, excludeTubeId?: string): Promise<ConflictCheckResult> {
    const result: ConflictCheckResult = { isValid: true, errors: [] };

    try {
      const existingTube = await this.tubeRepository.findByLocation(location);
      
      if (existingTube && existingTube.id !== excludeTubeId) {
        result.isValid = false;
        result.conflictingTube = existingTube;
        result.errors.push(
          `Position ${location.toString()} is already occupied by tube ${existingTube.id}` +
          (existingTube.cellType ? ` (${existingTube.cellType})` : '') +
          (existingTube.researcherId ? ` - researcher:${existingTube.researcherId}` : '')        );
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Unable to check for position conflicts');
    }

    return result;
  }

  /**
   * Apply business rules specific to position placement
   */
  async applyPositionBusinessRules(location: Location): Promise<PositionValidationWithWarnings> {
    const result: PositionValidationWithWarnings = { isValid: true, errors: [], warnings: [] };

    try {
      // Business Rule: Check for overcrowding in a box
      const occupiedPositions = await this.tubeRepository.getOccupiedPositions(
        location.tankId, 
        location.rackId, 
        location.boxId
      );
      
      const maxPosition = await this.configurationRepository.getMaxPosition(
        location.tankId, 
        location.rackId, 
        location.boxId
      );
      
      const occupancyRate = occupiedPositions.length / maxPosition;
      
      if (occupancyRate > 0.9) {
        result.warnings?.push(`Box ${location.boxId} is ${Math.round(occupancyRate * 100)}% full. Consider using a different box.`);
      }

      // Business Rule: Check for pattern consistency (adjacent tubes from same researcher)
      const nearbyTubes = await this.getNearbyTubes(location);
      const researchers = new Set(nearbyTubes.map(tube => tube.researcherId).filter(r => r));
      if (researchers.size === 1 && nearbyTubes.length > 0) {
        const researcherId = Array.from(researchers)[0];
        result.warnings?.push(`Adjacent tubes belong to researcher ${researcherId}. Consider consistency.`);
      }

      // Business Rule: Validate position number is reasonable
      if (location.position > maxPosition) {
        result.isValid = false;
        result.errors.push(`Position ${location.position} exceeds box capacity of ${maxPosition}`);
      }

    } catch (error) {
      // Non-critical business rules shouldn't fail the operation
      result.warnings?.push('Unable to apply some position business rules');
    }

    return result;
  }

  // TUBE MOVEMENT OPERATIONS

  /**
   * Validate if a tube can be moved to a new location
   */
  async canMoveTubeTo(tube: Tube, newLocation: Location): Promise<PositionValidationResult> {
    // Exclude the tube being moved from conflict checking
    return this.canPlaceTubeAt(newLocation, tube.id);
  }

  /**
   * Get suggested alternative positions if the requested position is not available
   */
  async getSuggestedAlternativePositions(location: Location, limit: number = 5): Promise<Location[]> {
    try {
      const occupiedPositions = await this.tubeRepository.getOccupiedPositions(
        location.tankId,
        location.rackId,
        location.boxId
      );

      const availablePositions = await this.configurationRepository.getAvailablePositions(
        location.tankId,
        location.rackId,
        location.boxId,
        occupiedPositions
      );

      // Sort by proximity to requested position
      const sortedPositions = availablePositions
        .sort((a, b) => Math.abs(a - location.position) - Math.abs(b - location.position))
        .slice(0, limit);

      return sortedPositions.map(position => 
        Location.create(location.tankId, location.rackId, location.boxId, position)
      );
    } catch (error) {
      return [];
    }
  }

  // POSITION ANALYSIS

  /**
   * Get nearby tubes for pattern analysis
   */
  private async getNearbyTubes(location: Location): Promise<Tube[]> {
    try {
      const allTubesInBox = await this.tubeRepository.findByRackAndBox(location.rackId, location.boxId);
      
      // Define "nearby" as positions within +/- 10 of the target position
      const nearbyTubes = allTubesInBox.filter(tube => {
        const distance = Math.abs(tube.position - location.position);
        return distance <= 10 && tube.tankId === location.tankId;
      });

      return nearbyTubes;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get position statistics for a box
   */
  async getBoxStatistics(tankId: string, rackId: string, boxId: string): Promise<BoxStatistics> {
    try {
      const tubes = await this.tubeRepository.findByRackAndBox(rackId, boxId);
      const boxTubes = tubes.filter(tube => tube.tankId === tankId);
      const maxPosition = await this.configurationRepository.getMaxPosition(tankId, rackId, boxId);

      const researchers = new Set(boxTubes.map(tube => tube.researcherId).filter(r => r));      const cellTypes = new Set(boxTubes.map(tube => tube.cellType).filter(ct => ct));
      
      const occupiedPositions = boxTubes.map(tube => tube.position);
      const availablePositions = [];
      for (let i = 1; i <= maxPosition; i++) {
        if (!occupiedPositions.includes(i)) {
          availablePositions.push(i);
        }
      }

      return {
        totalCapacity: maxPosition,
        occupiedCount: boxTubes.length,
        availableCount: availablePositions.length,
        occupancyRate: boxTubes.length / maxPosition,
        researcherCount: researchers.size,
        cellTypeCount: cellTypes.size,
        availablePositions,
        occupiedPositions: occupiedPositions.sort((a, b) => a - b)
      };
    } catch (error) {
      throw new ValidationError(`Unable to calculate statistics for box ${boxId}`);
    }
  }

  /**
   * Find optimal position in a box based on business rules
   */
  async findOptimalPosition(
    tankId: string, 
    rackId: string, 
    boxId: string, 
    researcher?: string
  ): Promise<Location | null> {
    try {
      const stats = await this.getBoxStatistics(tankId, rackId, boxId);
      
      if (stats.availableCount === 0) {
        return null; // Box is full
      }

      let optimalPosition: number;

      if (researcher) {
        // Try to place near tubes from the same researcher
        const researcherTubes = await this.tubeRepository.findByResearcher(researcher);
        const sameBoxTubes = researcherTubes.filter(tube => 
          tube.tankId === tankId && 
          tube.rackId === rackId && 
          tube.boxId === boxId
        );

        if (sameBoxTubes.length > 0) {
          // Find available position closest to existing researcher tubes
          const researcherPositions = sameBoxTubes.map(tube => tube.position);
          const avgPosition = researcherPositions.reduce((a, b) => a + b, 0) / researcherPositions.length;
          
          optimalPosition = stats.availablePositions.reduce((closest, current) => 
            Math.abs(current - avgPosition) < Math.abs(closest - avgPosition) ? current : closest
          );
        } else {
          // Use first available position for new researchers
          optimalPosition = Math.min(...stats.availablePositions);
        }
      } else {
        // Default: use first available position
        optimalPosition = Math.min(...stats.availablePositions);
      }

      return Location.create(tankId, rackId, boxId, optimalPosition);
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch-validate positions within a single box (synchronous, no DB calls).
   * All positions must be in the same tank/rack/box.
   */
  validatePositionBatch(
    positions: Array<{ tankId: string; rackId: string; boxId: string; position: number }>,
    preloadedData: {
      config: Configuration;
      occupiedPositions: Set<number>;
      maxPosition: number;
      tubesInBox: Tube[];
    }
  ): Map<number, { isValid: boolean; reason?: string }> {
    const results = new Map<number, { isValid: boolean; reason?: string }>();

    if (positions.length === 0) return results;

    // 1. Validate equipment config once using the first position's location
    const { tankId, rackId, boxId } = positions[0];
    const testLocation = Location.create(tankId, rackId, boxId, 1);
    const locationValid = preloadedData.config.isLocationValid(
      Location.create(tankId, rackId, boxId, 1)
    );

    // Check if box exists at all (position 1 may exceed max, so check box separately)
    const boxInfo = preloadedData.config.getBox(tankId, rackId, boxId);
    if (!boxInfo) {
      const reason = `Location ${tankId}-${rackId}-${boxId} does not exist in equipment configuration`;
      for (const pos of positions) {
        results.set(pos.position, { isValid: false, reason });
      }
      return results;
    }

    // 2. Track intra-batch claimed positions to detect duplicates within the batch
    const claimedInBatch = new Set<number>();

    for (const pos of positions) {
      // Check position exceeds max
      if (pos.position > preloadedData.maxPosition) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} exceeds box capacity of ${preloadedData.maxPosition}`
        });
        continue;
      }

      // Check against pre-existing occupied positions
      if (preloadedData.occupiedPositions.has(pos.position)) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} is already occupied`
        });
        continue;
      }

      // Check against intra-batch duplicates
      if (claimedInBatch.has(pos.position)) {
        results.set(pos.position, {
          isValid: false,
          reason: `Position ${pos.position} is claimed by another tube in this batch`
        });
        continue;
      }

      claimedInBatch.add(pos.position);
      results.set(pos.position, { isValid: true });
    }

    // 3. Occupancy warning (>90% full including batch size)
    const totalOccupied = preloadedData.occupiedPositions.size + claimedInBatch.size;
    const occupancyRate = totalOccupied / preloadedData.maxPosition;
    if (occupancyRate > 0.9) {
      // Add warning to all valid results
      for (const [position, result] of results) {
        if (result.isValid) {
          results.set(position, {
            isValid: true,
            reason: `Warning: Box ${boxId} will be ${Math.round(occupancyRate * 100)}% full after this batch`
          });
        }
      }
    }

    return results;
  }

  /**
   * Validate position for tube placement (used by application service)
   */
  async validatePosition(
    tankId: string,
    rackId: string,
    boxId: string,
    position: number,
    tubeRepository: TubeRepository,
    excludeTubeId?: string
  ): Promise<{ isValid: boolean; reason?: string; conflicts?: PositionConflict[] }> {
    const location = Location.create(tankId, rackId, boxId, position);
    const result = await this.canPlaceTubeAt(location, excludeTubeId);

    if (result.isValid) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        reason: result.errors.join('; '),
        conflicts: undefined
      };
    }
  }

  /**
   * Validate position using display label (e.g., "C5" or "23")
   *
   * Parses the label based on box configuration and validates the position.
   *
   * @param tankId - Tank identifier
   * @param rackId - Rack identifier
   * @param boxId - Box identifier
   * @param positionLabel - Display label (e.g., "C5", "A1", "23")
   * @param tubeRepository - Tube repository instance
   * @param excludeTubeId - Optional tube ID to exclude from conflict checking
   * @returns Validation result with numeric position if valid
   */
  async validatePositionByLabel(
    tankId: string,
    rackId: string,
    boxId: string,
    positionLabel: string,
    tubeRepository: TubeRepository,
    excludeTubeId?: string
  ): Promise<{ isValid: boolean; position?: number; reason?: string; conflicts?: PositionConflict[] }> {
    try {
      // Get box configuration to determine position display format
      const configuration = await this.configurationRepository.getCurrent();

      if (!configuration) {
        return { isValid: false, reason: 'Configuration not found' };
      }

      // Find the specific box using EquipmentConfiguration domain method
      const box = configuration.equipment.findBox(tankId, rackId, boxId);
      if (!box) {
        return {
          isValid: false,
          reason: `Box '${boxId}' not found in tank '${tankId}', rack ${rackId}, or equipment is inactive`
        };
      }

      // Parse label to numeric position using box methods
      let numericPosition: number;
      try {
        numericPosition = box.parsePositionLabel(positionLabel);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isValid: false,
          reason: `Invalid position label '${positionLabel}': ${message}`
        };
      }

      // Use standard position validation
      const validationResult = await this.validatePosition(
        tankId,
        rackId,
        boxId,
        numericPosition,
        tubeRepository,
        excludeTubeId
      );

      // Include numeric position in response
      return {
        ...validationResult,
        position: numericPosition,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        reason: `Error validating position label: ${message}`,
      };
    }
  }
}

// TYPES AND INTERFACES

interface ConflictCheckResult extends PositionValidation {
  conflictingTube?: Tube;
}
