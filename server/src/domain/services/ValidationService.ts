import { Tube } from '@domain/entities/Tube';
import { User } from '@domain/entities/User';
import { Researcher } from '@domain/entities/Researcher';
import { Configuration } from '@domain/entities/Configuration';
import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';
import { MediaData } from '@domain/valueObjects/Media';
import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { ValidationError } from '@domain/errors/ValidationError';
import { TubePositionService } from '@domain/services/TubePositionService';
import { AccessControlService } from '@domain/services/AccessControlService';
import type { ConfigurationUpdateData } from '@domain/types/configuration';

/**
 * ValidationService
 * 
 * Domain service that handles complex validation logic that spans
 * multiple aggregates and requires cross-entity business rules.
 * 
 * This service coordinates validation that involves:
 * - Multiple entities and their relationships
 * - Complex business rules that cross entity boundaries
 * - Integration between domain services
 * - Comprehensive validation for operations
 */
export class ValidationService {
  
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private configurationRepository: ConfigurationRepository,
    private tubePositionService: TubePositionService,
    private accessControlService: AccessControlService
  ) {}

  // TUBE VALIDATION

  /**
   * Comprehensive validation for tube creation
   */
  async validateTubeCreation(
    tubeData: TubeCreationData,
    user: User
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Permission validation
    try {
      await this.accessControlService.requireTubeAccess(user, null as any, 'create');
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : 'Permission denied');
      return result; // Stop validation if no permission
    }

    // 2. Location validation (via TubePositionService)
    const location = Location.create(tubeData.location.tankId, String(tubeData.location.rackId), tubeData.location.boxId, tubeData.location.position);
    const positionValidation = await this.tubePositionService.canPlaceTubeAt(location);
    
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
        media: tubeData.sample.media,
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
    const businessRules = await this.validateTubeBusinessRules(tubeData, 'create');
    if (!businessRules.isValid) {
      result.isValid = false;
      result.errors.push(...businessRules.errors);
    }
    result.warnings.push(...businessRules.warnings);

    return result;
  }

  /**
   * Comprehensive validation for tube updates
   */
  async validateTubeUpdate(
    tube: Tube,
    updates: TubeUpdateData,
    user: User
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
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
      
      const positionValidation = await this.tubePositionService.canPlaceTubeAt(newLocation, tube.id);
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
          media: newSampleData.media,
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
    const businessRules = await this.validateTubeBusinessRules(mergedData, 'update');
    if (!businessRules.isValid) {
      result.isValid = false;
      result.errors.push(...businessRules.errors);
    }
    result.warnings.push(...businessRules.warnings);

    return result;
  }

  /**
   * Validation for tube deletion
   */
  async validateTubeDeletion(tube: Tube, user: User): Promise<ValidationResult> {
    const result: ValidationResult = {
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

  /**
   * Validate bulk tube operations
   */
  async validateBulkTubeOperation(
    operation: 'update' | 'delete',
    tubeIds: string[],
    updates: Partial<TubeUpdateData> | null,
    user: User
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
        const tube = await this.tubeRepository.findById(tubeId);
        if (!tube) {
          result.invalidItems.push({
            id: tubeId,
            errors: ['Tube not found']
          });
          continue;
        }

        let validation: ValidationResult;
        
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

  /**
   * Validate researcher ID reference
   * Validates researcher ID instead of name
   */
  async validateResearcherIdReference(researcherId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
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
        // Note: Researcher names are now in Person entity
        // TODO: Look up Person to display name in warning message
        result.warnings.push(`Researcher '${researcher.id}' is marked as inactive`);
      }
    } catch (error) {
      result.warnings.push('Unable to verify researcher information');
    }

    return result;
  }

  // CONFIGURATION VALIDATION

  /**
   * Validate system configuration changes
   */
  async validateConfigurationUpdate(
    currentConfig: Configuration,
    updates: ConfigurationUpdateData,
    user: User
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. Permission check
    try {
      const accessResult = await this.accessControlService.canModifyConfiguration(user);
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
    if (this.isEquipmentBeingRemoved(updates)) {
      const equipmentValidation = await this.validateEquipmentRemoval(updates);
      if (!equipmentValidation.isValid) {
        result.isValid = false;
        result.errors.push(...equipmentValidation.errors);
      }
      result.warnings.push(...equipmentValidation.warnings);
    }

    // 3. Business rules for configuration changes
    const businessRules = await this.validateConfigurationBusinessRules(currentConfig, updates);
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
            updates.sample.media !== undefined ||
            updates.sample.cultureCondition !== undefined ||
            updates.sample.lotNumber !== undefined ||
            updates.sample.notes !== undefined);
  }

  private async validateTubeBusinessRules(
    tubeData: TubeCreationData | any,
    operation: 'create' | 'update'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
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
        });
        
        if (existingTubes.length > 0) {
          result.warnings.push(`${existingTubes.length} other tube(s) found with the same donor internal ID`);
        }
      } catch (error) {
        // Non-critical check, don't fail validation
      }
    }

    return result;
  }

  private isEquipmentBeingRemoved(updates: ConfigurationUpdateData): boolean {
    // Check if any equipment is being marked as inactive or removed
    return updates.tanks?.some(tank => !tank.isActive) ||
           updates.equipment?.racks?.some(rack => !rack.isActive) ||
           updates.equipment?.boxes?.some(box => !box.isActive);
  }

  private async validateEquipmentRemoval(updates: ConfigurationUpdateData): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if any tubes would be affected by equipment removal
    // This is a simplified implementation - could be more comprehensive
    
    if (updates.tanks) {
      for (const tank of updates.tanks) {
        if (!tank.isActive) {
          const tubeCount = await this.tubeRepository.countByTank(tank.id);
          if (tubeCount > 0) {
            result.isValid = false;
            result.errors.push(`Cannot deactivate tank '${tank.id}' - it contains ${tubeCount} tubes`);
          }
        }
      }
    }

    return result;
  }

  private async validateConfigurationBusinessRules(
    currentConfig: Configuration,
    updates: ConfigurationUpdateData
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Business rule: Ensure at least one tank remains active
    if (updates.tanks) {
      const activeTanks = updates.tanks.filter(tank => tank.isActive);
      if (activeTanks.length === 0) {
        result.isValid = false;
        result.errors.push('At least one tank must remain active');
      }
    }

    return result;
  }
}

// TYPES AND INTERFACES

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkValidationResult {
  isValid: boolean;
  validItems: Array<{
    id: string;
    warnings: string[];
  }>;
  invalidItems: Array<{
    id: string;
    errors: string[];
    warnings?: string[];
  }>;
  warnings: string[];
}

/**
 * Tube creation data with nested structure matching shared schemas
 */
export interface TubeCreationData {
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  sample: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    media?: MediaData | string;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;}

/**
 * Tube update data for PATCH operations
 */
export interface TubeUpdateData {
  location?: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    position?: number;
  };
  sample?: {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    media?: MediaData | string;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  };
  researcherId?: string;}
