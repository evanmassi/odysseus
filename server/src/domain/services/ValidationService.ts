/**
 * Cross-Entity Validation Orchestration
 *
 * Coordinates validation across multiple aggregates for tube, researcher, and storage operations.
 */

import { Tube } from '@domain/entities/Tube';
import { User } from '@domain/entities/User';
import { Storage } from '@domain/entities/Storage';
import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { StorageRepository } from '@domain/repositories/StorageRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { TubePositionService } from '@domain/services/TubePositionService';
import { AccessControlService } from '@domain/services/AccessControlService';
import type { DomainValidationResult, BulkValidationResult } from '@domain/types/services';
import type { TubeCreationData, TubeUpdateData, TubeBusinessRuleInput } from '@domain/types/services';
export class ValidationService {
  
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private storageRepository: StorageRepository,
    private personRepository: PersonRepository,
    private tubePositionService: TubePositionService,
    private accessControlService: AccessControlService
  ) {}

  // TUBE VALIDATION

  async validateTubeCreation(
    tubeData: TubeCreationData,
    user: User
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Permission validation
    try {
      this.accessControlService.requireCanCreateTube(user);
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Permission denied');
      return result; // Stop validation if no permission
    }

    // 2. Location validation (via TubePositionService)
    const location = Location.create(tubeData.location.tankId, String(tubeData.location.rackId), tubeData.location.boxId, tubeData.location.position);
    const positionValidation = await this.tubePositionService.canPlaceTubeAt(location, user.labId ?? '');

    if (!positionValidation.isValid) {
      result.isValid = false;
      result.errors.push(...positionValidation.errors);
    }
    
    if (positionValidation.warnings) {
      result.warnings.push(...positionValidation.warnings);
    }

    // 3. Sample data validation
    try {
      SampleData.create({
        cellType: tubeData.sample.cellType,
        donorInternalId: tubeData.sample.donorInternalId,
        donorSourceId: tubeData.sample.donorSourceId,
        concentration: tubeData.sample.concentration,
        concentrationUnit: tubeData.sample.concentrationUnit,
        date: tubeData.sample.date,
        mediaType: tubeData.sample.mediaType,
        mediaSupplements: tubeData.sample.mediaSupplements,
        mediaSelection: tubeData.sample.mediaSelection,
        cultureCondition: tubeData.sample.cultureCondition,
        lotNumber: tubeData.sample.lotNumber,
        notes: tubeData.sample.notes
      });
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Sample data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Researcher validation
    if (tubeData.researcherId) {
      const researcherValidation = await this.validateResearcherIdReference(tubeData.researcherId);
      if (!researcherValidation.isValid) {
        result.warnings.push(...researcherValidation.errors);
      }
    }

    // 5. Business rules validation
    const businessRules = await this.validateTubeBusinessRules(tubeData, 'create', user.labId ?? '');
    if (!businessRules.isValid) {
      result.isValid = false;
      result.errors.push(...businessRules.errors);
    }
    result.warnings.push(...businessRules.warnings);

    return result;
  }

  async validateTubeUpdate(
    tube: Tube,
    updates: TubeUpdateData,
    user: User
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Permission validation
    try {
      await this.accessControlService.requireTubeAccess(user, tube, 'edit');
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Permission denied');
      return result;
    }

    // 2. Location validation (if location is being changed)
    if (this.isLocationBeingChanged(tube, updates)) {
      const newLocation = Location.create(
        updates.location?.tankId ?? tube.tankId,
        updates.location?.rackId ?? tube.rackId,
        updates.location?.boxId ?? tube.boxId,
        updates.location?.position ?? tube.position
      );
      
      const positionValidation = await this.tubePositionService.canPlaceTubeAt(newLocation, user.labId ?? '', tube.id);
      if (!positionValidation.isValid) {
        result.isValid = false;
        result.errors.push(...positionValidation.errors);
      }
      if (positionValidation.warnings) {
        result.warnings.push(...positionValidation.warnings);
      }
    }

    // 3. Sample data validation (if sample data is being changed)
    if (this.isSampleDataBeingChanged(updates)) {
      try {
        const currentSampleData = tube.sampleData.toData();
        const newSampleData = { ...currentSampleData, ...updates.sample };
        
        SampleData.create({
          cellType: newSampleData.cellType,
          donorInternalId: newSampleData.donorInternalId,
          donorSourceId: newSampleData.donorSourceId,
          concentration: newSampleData.concentration,
          concentrationUnit: newSampleData.concentrationUnit,
          date: newSampleData.date,
          mediaType: newSampleData.mediaType,
          mediaSupplements: newSampleData.mediaSupplements,
          mediaSelection: newSampleData.mediaSelection,
          cultureCondition: newSampleData.cultureCondition,
          lotNumber: newSampleData.lotNumber,
          notes: newSampleData.notes
        });
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Sample data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Researcher validation
    if (updates.researcherId !== undefined) {
      if (updates.researcherId.trim() === '') {
        result.warnings.push('Tube will be unassigned from any researcher');
      } else {
        const researcherValidation = await this.validateResearcherIdReference(updates.researcherId);
        if (!researcherValidation.isValid) {
          result.warnings.push(...researcherValidation.errors);
        }
      }
    }

    // 5. Business rules validation
    const mergedData = { ...tube.toData(), ...updates };
    const businessRules = await this.validateTubeBusinessRules(mergedData, 'update', user.labId ?? '');
    if (!businessRules.isValid) {
      result.isValid = false;
      result.errors.push(...businessRules.errors);
    }
    result.warnings.push(...businessRules.warnings);

    return result;
  }

  async validateTubeDeletion(tube: Tube, user: User): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Permission validation
    try {
      await this.accessControlService.requireTubeAccess(user, tube, 'delete');
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Permission denied');
      return result;
    }

    // 2. Business rules for deletion
    const daysSinceCreation = (Date.now() - tube.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > 30 && !user.isAdmin()) {
      result.warnings.push('Deleting a tube older than 30 days. Consider if this data should be archived instead.');
    }

    if (tube.hasCompleteSampleData()) {
      result.warnings.push('This tube has complete sample data. Deletion will permanently remove this information.');
    }

    return result;
  }

  // BULK OPERATIONS VALIDATION

  async validateBulkTubeOperation(
    operation: 'update' | 'delete',
    tubeIds: string[],
    updates: Partial<TubeUpdateData> | null,
    user: User,
    labId: string = ''
  ): Promise<BulkValidationResult> {
    const result: BulkValidationResult = {
      isValid: true,
      validItems: [],
      invalidItems: [],
      warnings: []
    };

    // 1. Check bulk operation permissions
    const accessResult = await this.accessControlService.canPerformBulkOperation(
      user, 
      operation === 'update' ? 'edit' : 'delete', 
      tubeIds
    );

    if (!accessResult.allowed) {
      result.isValid = false;
      result.invalidItems = tubeIds.map(id => ({
        id,
        errors: ['No permission for bulk operation']
      }));
      return result;
    }

    // 2. Validate each tube individually
    for (const tubeId of accessResult.allowedTubes) {
      try {
        const tube = await this.tubeRepository.findById(tubeId, labId);
        if (!tube) {
          result.invalidItems.push({
            id: tubeId,
            errors: ['Tube not found']
          });
          continue;
        }

        let validation: DomainValidationResult;

        if (operation === 'update' && updates) {
          validation = await this.validateTubeUpdate(tube, updates, user);
        } else {
          validation = await this.validateTubeDeletion(tube, user);
        }

        if (validation.isValid) {
          result.validItems.push({
            id: tubeId,
            warnings: validation.warnings
          });
        } else {
          result.invalidItems.push({
            id: tubeId,
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      } catch (error) {
        result.invalidItems.push({
          id: tubeId,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Add denied tubes to invalid items
    for (const tubeId of accessResult.deniedTubes) {
      const error = accessResult.errors.find(err => err.startsWith(tubeId));
      result.invalidItems.push({
        id: tubeId,
        errors: [error || 'Access denied']
      });
    }

    // Overall result is valid if at least one item is valid
    result.isValid = result.validItems.length > 0;

    // Add business rule warnings for bulk operations
    if (result.validItems.length !== tubeIds.length) {
      result.warnings.push(
        `${result.invalidItems.length} of ${tubeIds.length} tubes cannot be processed due to validation or permission errors`
      );
    }

    return result;
  }

  // RESEARCHER VALIDATION

  async validateResearcherIdReference(researcherId: string): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!researcherId || researcherId.trim() === '') {
      return result; // Empty researcher ID is valid
    }

    try {
      const researcher = await this.researcherRepository.findById(researcherId);

      if (!researcher) {
        result.errors.push(`Researcher ID '${researcherId}' not found in system.`);
      } else if (!researcher.isActive()) {
        const person = await this.personRepository.findById(researcher.personId);
        const name = person?.fullName ?? researcher.id;
        result.warnings.push(`Researcher '${name}' is marked as inactive`);
      }
    } catch (error) {
      result.warnings.push('Unable to verify researcher information');
    }

    return result;
  }

  // CONFIGURATION VALIDATION

  async validateStorageUpdate(
    currentConfig: Storage,
    updatedConfig: Storage,
    user: User,
    labId: string = ''
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
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
    if (this.isEquipmentBeingRemovedInConfig(currentConfig, updatedConfig)) {
      const equipmentValidation = await this.validateEquipmentRemovalInConfig(currentConfig, updatedConfig, labId);
      if (!equipmentValidation.isValid) {
        result.isValid = false;
        result.errors.push(...equipmentValidation.errors);
      }
      result.warnings.push(...equipmentValidation.warnings);
    }

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

  private isLocationBeingChanged(tube: Tube, updates: TubeUpdateData): boolean {
    return updates.location !== undefined &&
           (updates.location.tankId !== undefined ||
            updates.location.rackId !== undefined ||
            updates.location.boxId !== undefined ||
            updates.location.position !== undefined);
  }

  private isSampleDataBeingChanged(updates: TubeUpdateData): boolean {
    return updates.sample !== undefined &&
           (updates.sample.cellType !== undefined ||
            updates.sample.donorInternalId !== undefined ||
            updates.sample.donorSourceId !== undefined ||
            updates.sample.concentration !== undefined ||
            updates.sample.concentrationUnit !== undefined ||
            updates.sample.date !== undefined ||
            updates.sample.mediaType !== undefined ||
            updates.sample.mediaSupplements !== undefined ||
            updates.sample.mediaSelection !== undefined ||
            updates.sample.cultureCondition !== undefined ||
            updates.sample.lotNumber !== undefined ||
            updates.sample.notes !== undefined);
  }

  private async validateTubeBusinessRules(
    tubeData: TubeBusinessRuleInput,
    operation: 'create' | 'update',
    labId: string = ''
  ): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Extract sample data - handle both nested and flat structures (for merged data)
    const sample = tubeData.sample || tubeData;

    // Business rule: Warn about concentration without unit or vice versa
    if ((sample.concentration !== undefined) !== (sample.concentrationUnit !== undefined)) {
      result.warnings.push('Concentration and concentration unit should be specified together');
    }

    // Business rule: Check for reasonable date
    if (sample.date) {
      const sampleDate = new Date(sample.date);
      const now = new Date();
      const daysDiff = (now.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365 * 5) { // 5 years
        result.warnings.push('Sample date is more than 5 years old. Please verify this is correct.');
      }
    }

    // Business rule: Check for duplicate donor IDs (warning only)
    if (sample.donorInternalId) {
      try {
        const existingTubes = await this.tubeRepository.search({
          donorInternalId: sample.donorInternalId,
          limit: 5
        }, labId);
        
        if (existingTubes.length > 0) {
          result.warnings.push(`${existingTubes.length} other tube(s) found with the same donor internal ID`);
        }
      } catch (error) {
        // Non-critical check, don't fail validation
      }
    }

    return result;
  }

  private isEquipmentBeingRemovedInConfig(currentConfig: Storage, updatedConfig: Storage): boolean {
    const currentTanks = currentConfig.tanks;
    const updatedTanks = updatedConfig.tanks;
    const updatedTankIds = new Set(updatedTanks.map(t => t.id));

    for (const currentTank of currentTanks) {
      // Check if tank is completely removed
      if (!updatedTankIds.has(currentTank.id)) {
        return true;
      }

      // Check if tank is being deactivated
      const updatedTank = updatedTanks.find(t => t.id === currentTank.id);
      if (updatedTank && currentTank.isActive && !updatedTank.isActive) {
        return true;
      }

      // Check if any racks are being removed from this tank
      if (updatedTank) {
        const updatedRackIds = new Set(updatedTank.racks.map(r => r.id));
        for (const currentRack of currentTank.racks) {
          if (!updatedRackIds.has(currentRack.id)) {
            return true;
          }

          // Check if any boxes are being removed from this rack
          const updatedRack = updatedTank.racks.find(r => r.id === currentRack.id);
          if (updatedRack) {
            const updatedBoxIds = new Set(updatedRack.boxes.map(b => b.name));
            for (const currentBox of currentRack.boxes) {
              if (!updatedBoxIds.has(currentBox.name)) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  }

  private async validateEquipmentRemovalInConfig(currentConfig: Storage, updatedConfig: Storage, labId: string = ''): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
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
            const tubeCount = await this.tubeRepository.countByRack(currentTank.id, currentRack.id, labId);
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

  private async validateStorageBusinessRulesForConfig(config: Storage): Promise<DomainValidationResult> {
    const result: DomainValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
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

