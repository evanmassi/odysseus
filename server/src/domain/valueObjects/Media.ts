import { ValidationError } from '@domain/errors/ValidationError';

/**
 * Media Value Object - Structured culture media information
 * Represents biological culture media with type, supplements, and selection
 * Immutable and self-validating
 */
export interface MediaData {
  type?: string;
  supplements?: string;
  selection?: string;
}

export class Media {
  private constructor(
    private readonly _type?: string,
    private readonly _supplements?: string,
    private readonly _selection?: string
  ) {
    this.validate();
  }

  /**
   * Factory method to create Media from structured data
   * Treats empty strings as undefined for form data compatibility
   */
  static create(data?: MediaData | string | null): Media {
    // Handle null/undefined
    if (!data) {
      return new Media();
    }

    // Handle legacy string format (backwards compatibility)
    if (typeof data === 'string') {
      // Empty string → undefined
      const normalized = data.trim().length === 0 ? undefined : data;
      return new Media(normalized, undefined, undefined);
    }

    // Handle structured object format
    // Normalize empty strings to undefined (HTML forms send empty strings)
    const normalizeField = (value?: string): string | undefined => {
      if (value === undefined || value === null) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    };

    return new Media(
      normalizeField(data.type),
      normalizeField(data.supplements),
      normalizeField(data.selection)
    );
  }

  /**
   * Factory method for empty media
   */
  static empty(): Media {
    return new Media();
  }

  /**
   * Validate media data
   */
  private validate(): void {
    const fields = [
      { name: 'type', value: this._type, maxLength: 200 },
      { name: 'supplements', value: this._supplements, maxLength: 300 },
      { name: 'selection', value: this._selection, maxLength: 200 }
    ];

    for (const field of fields) {
      if (field.value !== undefined) {
        if (field.value.trim().length === 0) {
          throw new ValidationError(`Media ${field.name} cannot be empty`);
        }
        if (field.value.length > field.maxLength) {
          throw new ValidationError(`Media ${field.name} cannot exceed ${field.maxLength} characters`);
        }
      }
    }
  }

  /**
   * Check if media has any data
   */
  hasData(): boolean {
    return !!(this._type || this._supplements || this._selection);
  }

  /**
   * Check if media is complete (has type)
   */
  isComplete(): boolean {
    return !!this._type;
  }

  /**
   * Update media (returns new instance - immutable)
   */
  update(updates: Partial<MediaData>): Media {
    return Media.create({
      type: updates.type !== undefined ? updates.type : this._type,
      supplements: updates.supplements !== undefined ? updates.supplements : this._supplements,
      selection: updates.selection !== undefined ? updates.selection : this._selection
    });
  }

  /**
   * Convert to data object for serialization
   */
  toData(): MediaData | undefined {
    if (!this.hasData()) {
      return undefined;
    }
    
    return {
      type: this._type,
      supplements: this._supplements,
      selection: this._selection
    };
  }

  /**
   * Convert to legacy string format (backwards compatibility)
   */
  toLegacyString(): string | undefined {
    return this._type; // Use type as primary value for legacy systems
  }

  /**
   * Serialize to JSON string for database storage
   */
  toJsonString(): string | undefined {
    const data = this.toData();
    return data ? JSON.stringify(data) : undefined;
  }

  /**
   * Deserialize from JSON string (database format)
   */
  static fromJsonString(jsonString: string | null | undefined): Media {
    if (!jsonString) {
      return Media.empty();
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        return Media.create(parsed);
      }
    } catch {
      // Not valid JSON - treat as legacy string
    }

    // Fallback: treat as legacy string (type field)
    return Media.create(jsonString);
  }

  // Getters (immutable access)
  get type(): string | undefined { return this._type; }
  get supplements(): string | undefined { return this._supplements; }
  get selection(): string | undefined { return this._selection; }
}
