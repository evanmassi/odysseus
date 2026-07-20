/**
 * Sample Data
 *
 * Immutable value object for biological sample information with domain validation.
 */

import {
  CONCENTRATION_UNITS,
  type ConcentrationUnit,
  type TubeSample,
} from '@odysseus/shared-schemas';

import { ValidationError } from '@domain/errors/ValidationError';
export class SampleData {
  private constructor(
    private readonly _cellType?: string,
    private readonly _species?: string,
    private readonly _donorInternalId?: string,
    private readonly _donorSourceId?: string,
    private readonly _concentration?: number,
    private readonly _concentrationUnit?: ConcentrationUnit,
    private readonly _date?: string,
    private readonly _mediaType?: string,
    private readonly _mediaSupplements?: string,
    private readonly _mediaSelection?: string,
    private readonly _cultureCondition?: string,
    private readonly _lotNumber?: string,
    private readonly _source?: string,
    private readonly _catalogNumber?: string,
    private readonly _passageNumber?: number,
    private readonly _notes?: string
  ) {
    this.validate();
  }

  static create(data: TubeSample): SampleData {
    return new SampleData(
      data.cellType,
      data.species,
      data.donorInternalId,
      data.donorSourceId,
      data.concentration,
      data.concentrationUnit,
      data.date,
      data.mediaType,
      data.mediaSupplements,
      data.mediaSelection,
      data.cultureCondition,
      data.lotNumber,
      data.source,
      data.catalogNumber,
      data.passageNumber,
      data.notes
    );
  }

  private validate(): void {
    this.validateConcentration();
    this.validateDate();
    this.validateCellType();
    this.validateDonorIds();
    this.validatePassageNumber();
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
    if (hasUnit && !CONCENTRATION_UNITS.includes(this._concentrationUnit!)) {
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

  private validatePassageNumber(): void {
    if (this._passageNumber !== undefined && this._passageNumber !== null) {
      if (
        !Number.isInteger(this._passageNumber) ||
        this._passageNumber < 0 ||
        this._passageNumber > 999
      ) {
        throw new ValidationError('Passage number must be an integer between 0 and 999');
      }
    }
  }

  private validateStringFields(): void {
    const stringFields = [
      { name: 'species', value: this._species, maxLength: 200 },
      { name: 'source', value: this._source, maxLength: 200 },
      { name: 'media type', value: this._mediaType, maxLength: 200 },
      { name: 'media supplements', value: this._mediaSupplements, maxLength: 300 },
      { name: 'media selection', value: this._mediaSelection, maxLength: 200 },
      { name: 'catalog number', value: this._catalogNumber, maxLength: 200 },
      { name: 'culture condition', value: this._cultureCondition, maxLength: 300 },
      { name: 'lot number', value: this._lotNumber, maxLength: 100 },
      { name: 'notes', value: this._notes, maxLength: 1000 },
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
   * Implements PATCH tri-state semantics:
   * - Field omitted (undefined): preserve existing value
   * - Field with value: update to that value
   * - Field with null: clear (convert to undefined)
   */
  update(
    updates: Partial<{
      cellType?: string;
      species?: string | null;
      donorInternalId?: string | null;
      donorSourceId?: string | null;
      concentration?: number | null;
      concentrationUnit?: ConcentrationUnit | null;
      date?: string | null;
      mediaType?: string | null;
      mediaSupplements?: string | null;
      mediaSelection?: string | null;
      cultureCondition?: string | null;
      lotNumber?: string | null;
      source?: string | null;
      catalogNumber?: string | null;
      passageNumber?: number | null;
      notes?: string | null;
    }>
  ): SampleData {
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- three-way null/undefined/value logic throughout */
    let newConcentration =
      updates.concentration === null
        ? undefined
        : updates.concentration !== undefined
          ? updates.concentration
          : this._concentration;
    let newConcentrationUnit =
      updates.concentrationUnit === null
        ? undefined
        : updates.concentrationUnit !== undefined
          ? updates.concentrationUnit
          : this._concentrationUnit;

    // Business rule: concentration and unit are coupled - clearing one clears both
    if (updates.concentration === null || updates.concentrationUnit === null) {
      newConcentration = undefined;
      newConcentrationUnit = undefined;
    }

    return SampleData.create({
      cellType: updates.cellType !== undefined ? updates.cellType : this._cellType,
      species:
        updates.species === null
          ? undefined
          : updates.species !== undefined
            ? updates.species
            : this._species,
      donorInternalId:
        updates.donorInternalId === null
          ? undefined
          : updates.donorInternalId !== undefined
            ? updates.donorInternalId
            : this._donorInternalId,
      donorSourceId:
        updates.donorSourceId === null
          ? undefined
          : updates.donorSourceId !== undefined
            ? updates.donorSourceId
            : this._donorSourceId,
      concentration: newConcentration,
      concentrationUnit: newConcentrationUnit,
      date:
        updates.date === null ? undefined : updates.date !== undefined ? updates.date : this._date,
      mediaType:
        updates.mediaType === null
          ? undefined
          : updates.mediaType !== undefined
            ? updates.mediaType
            : this._mediaType,
      mediaSupplements:
        updates.mediaSupplements === null
          ? undefined
          : updates.mediaSupplements !== undefined
            ? updates.mediaSupplements
            : this._mediaSupplements,
      mediaSelection:
        updates.mediaSelection === null
          ? undefined
          : updates.mediaSelection !== undefined
            ? updates.mediaSelection
            : this._mediaSelection,
      cultureCondition:
        updates.cultureCondition === null
          ? undefined
          : updates.cultureCondition !== undefined
            ? updates.cultureCondition
            : this._cultureCondition,
      lotNumber:
        updates.lotNumber === null
          ? undefined
          : updates.lotNumber !== undefined
            ? updates.lotNumber
            : this._lotNumber,
      source:
        updates.source === null
          ? undefined
          : updates.source !== undefined
            ? updates.source
            : this._source,
      catalogNumber:
        updates.catalogNumber === null
          ? undefined
          : updates.catalogNumber !== undefined
            ? updates.catalogNumber
            : this._catalogNumber,
      passageNumber:
        updates.passageNumber === null
          ? undefined
          : updates.passageNumber !== undefined
            ? updates.passageNumber
            : this._passageNumber,
      notes:
        updates.notes === null
          ? undefined
          : updates.notes !== undefined
            ? updates.notes
            : this._notes,
    });
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  }

  toData(): TubeSample {
    return {
      cellType: this._cellType,
      species: this._species,
      donorInternalId: this._donorInternalId,
      donorSourceId: this._donorSourceId,
      concentration: this._concentration,
      concentrationUnit: this._concentrationUnit,
      date: this._date,
      mediaType: this._mediaType,
      mediaSupplements: this._mediaSupplements,
      mediaSelection: this._mediaSelection,
      cultureCondition: this._cultureCondition,
      lotNumber: this._lotNumber,
      source: this._source,
      catalogNumber: this._catalogNumber,
      passageNumber: this._passageNumber,
      notes: this._notes,
    };
  }

  get cellType(): string | undefined {
    return this._cellType;
  }
  get species(): string | undefined {
    return this._species;
  }
  get donorInternalId(): string | undefined {
    return this._donorInternalId;
  }
  get donorSourceId(): string | undefined {
    return this._donorSourceId;
  }
  get concentration(): number | undefined {
    return this._concentration;
  }
  get concentrationUnit(): ConcentrationUnit | undefined {
    return this._concentrationUnit;
  }
  get date(): string | undefined {
    return this._date;
  }
  get mediaType(): string | undefined {
    return this._mediaType;
  }
  get mediaSupplements(): string | undefined {
    return this._mediaSupplements;
  }
  get mediaSelection(): string | undefined {
    return this._mediaSelection;
  }
  get cultureCondition(): string | undefined {
    return this._cultureCondition;
  }
  get lotNumber(): string | undefined {
    return this._lotNumber;
  }
  get source(): string | undefined {
    return this._source;
  }
  get catalogNumber(): string | undefined {
    return this._catalogNumber;
  }
  get passageNumber(): number | undefined {
    return this._passageNumber;
  }
  get notes(): string | undefined {
    return this._notes;
  }
}
