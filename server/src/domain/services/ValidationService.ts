/**
 * Storage Configuration Validation
 *
 * Validates storage configuration updates: permission checks, equipment-removal
 * safety against existing tubes, and configuration business rules.
 */

import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { DomainValidationResult } from '@domain/types/services';
export class ValidationService {
  constructor(
    private tubeRepository: TubeRepository,
    private accessControlService: AccessControlService
  ) {}

  // CONFIGURATION VALIDATION

  async validateStorageUpdate(
    currentConfig: Storage,
    updatedConfig: Storage,
    user: User,
    labId: string
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 1. Permission check
    try {
      const accessResult = await this.accessControlService.canModifyStorage(user);
      if (!accessResult.allowed) {
        result.isValid = false;
        result.errors.push(accessResult.reason);
        return result;
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Unable to verify configuration permissions');
      return result;
    }

    // 2. Validate configuration changes don't break existing tubes
    const equipmentValidation = await this.validateEquipmentRemovalInConfig(
      currentConfig,
      updatedConfig,
      labId
    );
    if (!equipmentValidation.isValid) {
      result.isValid = false;
      result.errors.push(...equipmentValidation.errors);
    }
    result.warnings.push(...equipmentValidation.warnings);

    // 3. Business rules for configuration changes
    const businessRules = await this.validateStorageBusinessRulesForConfig(updatedConfig);
    if (!businessRules.isValid) {
      result.isValid = false;
      result.errors.push(...businessRules.errors);
    }
    result.warnings.push(...businessRules.warnings);

    return result;
  }

  // HELPER METHODS

  private async validateEquipmentRemovalInConfig(
    currentConfig: Storage,
    updatedConfig: Storage,
    labId: string
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const currentTanks = currentConfig.tanks;
    const updatedTanks = updatedConfig.tanks;
    const updatedTankIds = new Set(updatedTanks.map(t => t.id));

    for (const currentTank of currentTanks) {
      const updatedTank = updatedTanks.find(t => t.id === currentTank.id);

      // Check if tank is completely removed
      if (!updatedTankIds.has(currentTank.id)) {
        const tubeCount = await this.tubeRepository.countByTank(currentTank.id, labId);
        if (tubeCount > 0) {
          result.isValid = false;
          result.errors.push(
            `Cannot remove tank '${currentTank.name}' - it contains ${tubeCount} tube(s). ` +
              `Move or delete the tubes first.`
          );
        }
        continue;
      }

      // Check if tank is being deactivated
      if (updatedTank && currentTank.isActive && !updatedTank.isActive) {
        const tubeCount = await this.tubeRepository.countByTank(currentTank.id, labId);
        if (tubeCount > 0) {
          result.isValid = false;
          result.errors.push(
            `Cannot deactivate tank '${currentTank.name}' - it contains ${tubeCount} tube(s). ` +
              `Move or delete the tubes first.`
          );
        }
        continue;
      }

      // Check racks within this tank
      if (updatedTank) {
        const updatedRackIds = new Set(updatedTank.racks.map(r => r.id));

        for (const currentRack of currentTank.racks) {
          // Check if rack is completely removed
          if (!updatedRackIds.has(currentRack.id)) {
            const tubeCount = await this.tubeRepository.countByRack(
              currentTank.id,
              currentRack.id,
              labId
            );
            if (tubeCount > 0) {
              result.isValid = false;
              result.errors.push(
                `Cannot remove rack '${currentRack.name}' from tank '${currentTank.name}' - ` +
                  `it contains ${tubeCount} tube(s). Move or delete the tubes first.`
              );
            }
            continue;
          }

          // Check boxes within this rack
          const updatedRack = updatedTank.racks.find(r => r.id === currentRack.id);
          if (updatedRack) {
            const updatedBoxIds = new Set(updatedRack.boxes.map(b => b.name));

            for (const currentBox of currentRack.boxes) {
              if (!updatedBoxIds.has(currentBox.name)) {
                const tubeCount = await this.tubeRepository.countByBox(
                  currentTank.id,
                  currentRack.id,
                  currentBox.name,
                  labId
                );
                if (tubeCount > 0) {
                  result.isValid = false;
                  result.errors.push(
                    `Cannot remove box '${currentBox.name}' from rack '${currentRack.name}' - ` +
                      `it contains ${tubeCount} tube(s). Move or delete the tubes first.`
                  );
                }
              }
            }
          }
        }
      }
    }

    return result;
  }

  private async validateStorageBusinessRulesForConfig(
    config: Storage
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Business rule: Ensure at least one tank remains active
    const activeTanks = config.tanks.filter(tank => tank.isActive);
    if (activeTanks.length === 0) {
      result.isValid = false;
      result.errors.push('At least one tank must remain active');
    }

    return result;
  }
}
