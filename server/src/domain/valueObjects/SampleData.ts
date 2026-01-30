import { ValidationError } from '@domain/errors/ValidationError';
import { Media, MediaData } from '@domain/valueObjects/Media';

/**
 * SampleData Value Object - Encapsulates all sample-related validation and logic
 * Represents biological sample information with business rules
 * Immutable and self-validating
 */
export class SampleData {
  private constructor(
    private readonly _cellType?: string,
    private readonly _donorInternalId?: string,
    private readonly _donorSourceId?: string,
    private readonly _concentration?: number,
    private readonly _concentrationUnit?: 'c/v' | 'c/mL',
    private readonly _date?: string,
    private readonly _media?: Media,
    private readonly _cultureCondition?: string,
    private readonly _lotNumber?: string,
    private readonly _notes?: string
  ) {
    this.validate();
  }

  /**
   * Factory method to create SampleData with validation
   */
  static create(data: {
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
  }): SampleData {
    return new SampleData(
      data.cellType,
      data.donorInternalId,
      data.donorSourceId,
      data.concentration,
      data.concentrationUnit,
      data.date,
      data.media ? Media.create(data.media) : undefined,
      data.cultureCondition,
      data.lotNumber,
      data.notes
    );
  }

  /**
   * Factory method for empty sample data
   */
  static empty(): SampleData {
    return new SampleData();
  }

  /**
   * Validates all sample data according to business rules
   */
  private validate(): void {
    this.validateConcentration();
    this.validateDate();
    this.validateCellType();
    this.validateDonorIds();
    this.validateStringFields();
  }

  private validateConcentration(): void {
    // Treat both null and undefined as "absent" (supports PATCH semantics where null = clear)
    const hasConcentration = this._concentration !== undefined && this._concentration !== null;
    const hasUnit = this._concentrationUnit !== undefined && this._concentrationUnit !== null;

    // Business rule: Concentration requires unit
    if (hasConcentration && !hasUnit) {
      throw new ValidationError('Concentration requires a unit (c/v or c/mL)');
    }

    // Business rule: Unit requires concentration
    if (hasUnit && !hasConcentration) {
      throw new ValidationError('Concentration unit requires a concentration value');
    }

    // Business rule: Concentration must be positive
    if (hasConcentration && this._concentration! <= 0) {
      throw new ValidationError('Concentration must be greater than 0');
    }

    // Business rule: Concentration reasonable limits
    if (hasConcentration && this._concentration! > 1e12) {
      throw new ValidationError('Concentration exceeds reasonable limits');
    }

    // Validate unit values
    if (hasUnit && !['c/v', 'c/mL'].includes(this._concentrationUnit!)) {
      throw new ValidationError('Concentration unit must be "c/v" or "c/mL"');
    }
  }

  private validateDate(): void {
    if (this._date !== undefined) {
      // Business rule: Date must be parseable
      const parsedDate = new Date(this._date);
      if (isNaN(parsedDate.getTime())) {
        throw new ValidationError('Date must be in valid date format');
      }

      // Business rule: Date cannot be in the future
      if (parsedDate > new Date()) {
        throw new ValidationError('Sample date cannot be in the future');
      }

      // Labs often store samples for decades
      // Keep future date validation but allow historical samples of any age
    }
  }

  private validateCellType(): void {
    if (this._cellType !== undefined) {
      if (this._cellType.trim().length === 0) {
        throw new ValidationError('Cell type cannot be empty');
      }
      if (this._cellType.length > 200) {
        throw new ValidationError('Cell type cannot exceed 200 characters');
      }
    }
  }

  private validateDonorIds(): void {
    if (this._donorInternalId !== undefined && this._donorInternalId !== null) {
      if (this._donorInternalId.trim().length === 0) {
        throw new ValidationError('Donor internal ID cannot be empty');
      }
      if (this._donorInternalId.length > 100) {
        throw new ValidationError('Donor internal ID cannot exceed 100 characters');
      }
    }

    if (this._donorSourceId !== undefined && this._donorSourceId !== null) {
      if (this._donorSourceId.trim().length === 0) {
        throw new ValidationError('Donor source ID cannot be empty');
      }
      if (this._donorSourceId.length > 100) {
        throw new ValidationError('Donor source ID cannot exceed 100 characters');
      }
    }
  }

  private validateStringFields(): void {
    const stringFields = [
      { name: 'culture condition', value: this._cultureCondition, maxLength: 300 },
      { name: 'lot number', value: this._lotNumber, maxLength: 100 },
      { name: 'notes', value: this._notes, maxLength: 1000 }
    ];

    for (const field of stringFields) {
      if (field.value !== undefined && field.value !== null) {
        if (field.value.trim().length === 0) {
          throw new ValidationError(`${field.name} cannot be empty`);
        }
        if (field.value.length > field.maxLength) {
          throw new ValidationError(`${field.name} cannot exceed ${field.maxLength} characters`);
        }
      }
    }
  }

  /**
   * Update sample data with new values (returns new instance - immutable)
   * Implements PATCH tri-state semantics with deep-merge for nested objects:
   * - Field omitted (undefined): preserve existing value
   * - Field with value: update to that value (merge if nested object)
   * - Field with null: clear (convert to undefined)
   *
   * Nested objects (media) are deep-merged, not replaced
   * Example: { media: { type: 'RPMI' } } preserves supplements & selection
   */
  update(updates: Partial<{
    cellType?: string;
    donorInternalId?: string | null;
    donorSourceId?: string | null;
    concentration?: number | null;
    concentrationUnit?: 'c/v' | 'c/mL' | null;
    date?: string | null;
    media?: MediaData | string | null;
    cultureCondition?: string | null;
    lotNumber?: string | null;
    notes?: string | null;
  }>): SampleData {
    // Compute new concentration values with PATCH semantics
    // null = clear, undefined = preserve, value = set
    let newConcentration = updates.concentration === null
      ? undefined
      : (updates.concentration !== undefined ? updates.concentration : this._concentration);
    let newConcentrationUnit = updates.concentrationUnit === null
      ? undefined
      : (updates.concentrationUnit !== undefined ? updates.concentrationUnit : this._concentrationUnit);

    // Business rule: concentration and unit are coupled - clearing one clears both
    // This ensures the invariant "both present or both absent" is maintained
    if (updates.concentration === null || updates.concentrationUnit === null) {
      newConcentration = undefined;
      newConcentrationUnit = undefined;
    }

    return SampleData.create({
      cellType: updates.cellType !== undefined ? updates.cellType : this._cellType,
      // null = clear (convert to undefined), undefined = preserve, value = set
      donorInternalId: updates.donorInternalId === null ? undefined : (updates.donorInternalId !== undefined ? updates.donorInternalId : this._donorInternalId),
      donorSourceId: updates.donorSourceId === null ? undefined : (updates.donorSourceId !== undefined ? updates.donorSourceId : this._donorSourceId),
      concentration: newConcentration,
      concentrationUnit: newConcentrationUnit,
      date: updates.date === null ? undefined : (updates.date !== undefined ? updates.date : this._date),
      // Deep merge for nested objects: preserve sibling fields when partially updating
      media: updates.media === null
        ? undefined  // null = clear entire media object
        : updates.media !== undefined
          ? (this._media
              ? this._media.update(updates.media as MediaData).toData()  // Merge partial update with existing
              : updates.media)  // No existing media, create new
          : this._media?.toData(),  // undefined = preserve existing
      cultureCondition: updates.cultureCondition === null ? undefined : (updates.cultureCondition !== undefined ? updates.cultureCondition : this._cultureCondition),
      lotNumber: updates.lotNumber === null ? undefined : (updates.lotNumber !== undefined ? updates.lotNumber : this._lotNumber),
      notes: updates.notes === null ? undefined : (updates.notes !== undefined ? updates.notes : this._notes)
    });
  }

  /**
   * Check if sample has concentration data
   */
  hasConcentration(): boolean {
    return this._concentration !== undefined && this._concentrationUnit !== undefined;
  }

  /**
   * Check if sample is expired (business logic can be added here)
   */
  isExpired(): boolean {
    if (!this._date) return false;
    
    // Business rule: Samples are considered expired after 2 years
    const sampleDate = new Date(this._date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return sampleDate < twoYearsAgo;
  }

  /**
   * Check if sample has complete information
   */
  isComplete(): boolean {
    return !!(this._cellType && this._donorInternalId && this._date);
  }

  /**
   * Convert to data object for persistence/serialization
   */
  toData(): {
    cellType?: string;
    donorInternalId?: string;
    donorSourceId?: string;
    concentration?: number;
    concentrationUnit?: 'c/v' | 'c/mL';
    date?: string;
    media?: MediaData;
    cultureCondition?: string;
    lotNumber?: string;
    notes?: string;
  } {
    return {
      cellType: this._cellType,
      donorInternalId: this._donorInternalId,
      donorSourceId: this._donorSourceId,
      concentration: this._concentration,
      concentrationUnit: this._concentrationUnit,
      date: this._date,
      media: this._media?.toData(),
      cultureCondition: this._cultureCondition,
      lotNumber: this._lotNumber,
      notes: this._notes
    };
  }

  // Getters (immutable access)
  get cellType(): string | undefined { return this._cellType; }
  get donorInternalId(): string | undefined { return this._donorInternalId; }
  get donorSourceId(): string | undefined { return this._donorSourceId; }
  get concentration(): number | undefined { return this._concentration; }
  get concentrationUnit(): 'c/v' | 'c/mL' | undefined { return this._concentrationUnit; }
  get date(): string | undefined { return this._date; }
  get media(): MediaData | undefined { return this._media?.toData(); }
  get cultureCondition(): string | undefined { return this._cultureCondition; }
  get lotNumber(): string | undefined { return this._lotNumber; }
  get notes(): string | undefined { return this._notes; }
}
