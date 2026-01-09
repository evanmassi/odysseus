/**
 * Zod schemas for tube data validation
 * Provides runtime validation and TypeScript type generation
 *
 * Architecture:
 * - Domain schemas (tubeSampleSchema, tubeMediaSchema): Strict types, no preprocessing
 * - Request schemas (createTubeRequestSchema, updateTubeRequestSchema): Preprocessing for HTML forms
 * - Validation utilities in tubeValidation.ts provide single source of truth for parsing
 */

import { z } from 'zod';
import {
  concentrationPreprocessor,
  concentrationPreprocessorNullable,
  datePreprocessor,
  datePreprocessorNullable,
  optionalFromEmpty,
  nullableOptionalFromEmpty,
  concentrationUnitRefinement
} from './tubeValidation';
import { EQUIPMENT_DEFAULTS } from '../constants/equipmentDefaults';

/**
 * Concentration unit enum values (const tuple for type preservation)
 */
export const CONCENTRATION_UNITS = ['c/v', 'c/mL'] as const;
export type ConcentrationUnit = typeof CONCENTRATION_UNITS[number];

/**
 * Default value for unknown researcher (used in optimistic updates)
 */
export const UNKNOWN_RESEARCHER = 'Unknown' as const;

/**
 * Core tube location schema
 * Required fields - strict validation
 */
export const tubeLocationSchema = z.object({
  tankId: z.string().min(1, 'Tank ID is required'),
  rackId: z.string().min(1, 'Rack ID is required'),
  boxId: z.string().min(1, 'Box ID is required'),
  position: z.number().int().min(1).max(EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX, `Position must be between 1-${EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX}`)
});

/**
 * Concentration unit schema (reusable, preserves literal types)
 */
export const concentrationUnitSchema = z.enum(CONCENTRATION_UNITS);

/**
 * Tube media data schema
 * Domain schema - strict types, no preprocessing
 */
export const tubeMediaSchema = z.object({
  type: z.string().optional(),
  supplements: z.string().optional(),
  selection: z.string().optional()
});

/**
 * Tube sample data schema
 * Domain schema with strict types used for API responses and domain entities.
 * No preprocessing - maintains type precision.
 */
export const tubeSampleSchema = z.object({
  cellType: z.string().optional(),
  donorInternalId: z.string().optional(),
  donorSourceId: z.string().optional(),
  concentration: z.number().optional(),
  concentrationUnit: concentrationUnitSchema.optional(),
  date: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    z.string().datetime('Invalid date format'),
    z.date() // Accept Date objects from server responses
  ]).optional(),
  media: tubeMediaSchema.optional(),
  cultureCondition: z.string().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Tube timestamps schema
 */
export const tubeTimestampsSchema = z.object({
  createdAt: z.union([z.string().datetime('Invalid created date'), z.date()]),
  updatedAt: z.union([z.string().datetime('Invalid updated date'), z.date()])
});

/**
 * Complete tube data schema
 */
export const tubeDataSchema = z.object({
  id: z.string().min(1, 'Tube ID is required'),
  location: tubeLocationSchema,
  sample: tubeSampleSchema,
  researcherId: z.string().optional(),
  createdByName: z.string().optional(),
  timestamps: tubeTimestampsSchema,
  // Lock fields
  isLocked: z.boolean().optional(),
  lockedBy: z.string().optional(),
  lockNote: z.string().max(100).optional(),
  lockedAt: z.string().datetime().optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
});

/**
 * Array of tubes schema
 */
export const tubeDataArraySchema = z.array(tubeDataSchema);

/**
 * Tube creation request sample schema
 * Preprocesses HTML form data:
 * - Empty strings → error for required fields
 * - Scientific notation → number (unified parser)
 * - Business rule: concentration + unit together or both absent
 */
export const createTubeRequestSampleSchema = concentrationUnitRefinement(
  z.object({
    cellType: z.preprocess(
      (val) => {
        // Reject empty strings to trigger validation error
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed || ''; // Return empty string to trigger .min(1) error
        }
        return val;
      },
      z.string().min(1, 'Cell type is required')
    ),
    donorInternalId: optionalFromEmpty(z.string()),
    donorSourceId: optionalFromEmpty(z.string()),
    concentration: concentrationPreprocessor,
    concentrationUnit: optionalFromEmpty(concentrationUnitSchema),
    date: datePreprocessor,
    media: tubeMediaSchema.optional(),
    cultureCondition: optionalFromEmpty(z.string()),
    lotNumber: optionalFromEmpty(z.string()),
    notes: optionalFromEmpty(z.string())
  })
);

/**
 * Tube creation request schema (without ID and timestamps)
 * Handles HTML form empty strings through preprocessing.
 */
export const createTubeRequestSchema = z.object({
  location: tubeLocationSchema,
  sample: createTubeRequestSampleSchema,
  researcherId: optionalFromEmpty(z.string())
});

/**
 * Tube update sample schema
 * Supports tri-state PATCH semantics: empty strings → undefined, null preserved.
 * Business rule: concentration + unit must both be present or both absent.
 * cellType must not be empty if provided.
 */
export const tubeUpdateSampleSchema = concentrationUnitRefinement(
  z.object({
    cellType: z.preprocess(
      (val) => {
        // undefined/null → valid (field not included in PATCH)
        if (val === undefined || val === null) return undefined;
        // Empty string → keep as empty to fail validation
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed || ''; // Return empty string to trigger .min(1) error
        }
        return val;
      },
      z.union([
        z.string().min(1, 'Cell type is required'),
        z.undefined()
      ])
    ),
    donorInternalId: nullableOptionalFromEmpty(z.string()),
    donorSourceId: nullableOptionalFromEmpty(z.string()),
    concentration: concentrationPreprocessorNullable,
    concentrationUnit: nullableOptionalFromEmpty(concentrationUnitSchema),
    date: datePreprocessorNullable,
    media: tubeMediaSchema.nullable().optional(),
    cultureCondition: nullableOptionalFromEmpty(z.string()),
    lotNumber: nullableOptionalFromEmpty(z.string()),
    notes: nullableOptionalFromEmpty(z.string())
  })
);

/**
 * Tube update request schema (partial data)
 * Uses nullable fields to support PATCH semantics (null = clear)
 */
export const updateTubeRequestSchema = z.object({
  location: tubeLocationSchema.partial().optional(),
  sample: tubeUpdateSampleSchema.optional(),
  researcherId: nullableOptionalFromEmpty(z.string()),
  /** Lock note update - only lock owner can modify */
  lockNote: z.string().max(100).optional()
});

/**
 * Tube query filters schema
 */
export const tubeQueryFiltersSchema = z.object({
  tankId: z.string().optional(),
  rackId: z.string().optional(),
  boxId: z.string().optional(),
  researcherId: z.string().optional(),
  cellType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasNotes: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional()
});

/**
 * Batch tube operation schema
 */
export const batchTubeOperationSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  tubes: z.union([
    z.array(createTubeRequestSchema), // for create
    z.array(z.object({
      id: z.string().min(1),
      data: updateTubeRequestSchema
    })), // for update
    z.array(z.string().min(1)) // for delete
  ])
});

/**
 * Note: Form-specific schemas removed
 * 
 * Previously had:
 * - tubeFormSampleSchema
 * - tubeFormDataSchema
 * - tubeFormValidationSchema (deprecated)
 *
 * These schemas were removed because:
 * - Client should use createTubeRequestSchema directly (API contract)
 * - No transformation needed (form data = API data)
 * - Reduces duplication and drift
 * - Single source of truth (API schema)
 *
 * Migration path:
 * - Client forms: Use createTubeRequestSchema instead
 * - Validation: Already enforced in API schema
 * - Business rules: Concentration+unit refinement applied
 */

/**
 * Tube validation result schema
 */
export const tubeValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string()
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string()
  })).optional()
});

/**
 * Domain types used for API responses, database, and domain logic
 */
export type TubeData = z.infer<typeof tubeDataSchema>;
export type TubeLocation = z.infer<typeof tubeLocationSchema>;
export type TubeSample = z.infer<typeof tubeSampleSchema>;
export type TubeUpdateSample = z.infer<typeof tubeUpdateSampleSchema>;
export type TubeMedia = z.infer<typeof tubeMediaSchema>;
export type TubeTimestamps = z.infer<typeof tubeTimestampsSchema>;
export type TubeQueryFilters = z.infer<typeof tubeQueryFiltersSchema>;
export type TubeValidationResult = z.infer<typeof tubeValidationResultSchema>;

/**
 * Request types (output of preprocessing - normalized data)
 */
export type CreateTubeRequest = z.output<typeof createTubeRequestSchema>;
export type UpdateTubeRequest = z.output<typeof updateTubeRequestSchema>;
export type BatchTubeOperation = z.infer<typeof batchTubeOperationSchema>;

/**
 * Form Input Types (input to preprocessing - raw form data)
 *
 * Represents the actual form state before Zod transformations:
 * - concentration: string (user types "1.5e6")
 * - date: string | Date (HTML input value)
 *
 * After Zod validation, these transform to the output types above.
 */
export type CreateTubeFormInput = z.input<typeof createTubeRequestSchema>;
export type UpdateTubeFormInput = z.input<typeof updateTubeRequestSchema>;

/**
 * @deprecated Use CreateTubeRequest from API schemas instead.
 *
 * Migration:
 * - TubeFormData → CreateTubeRequest (from createTubeRequestSchema)
 * - TubeFormSample → Infer from createTubeRequestSampleSchema
 */
export interface TubeFormSampleInput {
  cellType: string;
  donorInternalId?: string;
  donorSourceId?: string;
  concentration?: string | number;
  concentrationUnit?: 'c/v' | 'c/mL';
  date?: string;
  media?: TubeMedia;
  cultureCondition?: string;
  lotNumber?: string;
  notes?: string;
}

export interface TubeFormDataInput {
  sample: TubeFormSampleInput;
  researcherId?: string;
}

// Note: Output types removed - use API schema types instead
// - Use: type CreateTubeData = z.infer<typeof createTubeRequestSchema>
// - Use: type UpdateTubeData = z.infer<typeof updateTubeRequestSchema>

// UTILITY FUNCTIONS

/**
 * Tube position utilities with validation
 */
export const validateTubePosition = (position: number): boolean => {
  return position >= 1 && position <= EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX;
};

/**
 * Validate concentration/unit invariant
 */
export const validateConcentrationUnit = (
  concentration: number | undefined, 
  unit: ConcentrationUnit | undefined
): boolean => {
  if (concentration && !unit) return false;
  if (!concentration && unit) return false;
  return true;
};

/**
 * Transform legacy tube data to new schema
 */
export const transformLegacyTubeData = (legacyData: any): TubeData => {
  return tubeDataSchema.parse({
    id: legacyData.id,
    location: {
      tankId: legacyData.tankId,
      rackId: legacyData.rackId.toString(),
      boxId: legacyData.boxName,
      position: legacyData.position
    },
    sample: {
      cellType: legacyData.cellType,
      donorInternalId: legacyData.donorInternalId,
      donorSourceId: legacyData.donorSourceId,
      concentration: legacyData.concentration,
      concentrationUnit: legacyData.concentrationUnit,
      date: legacyData.date,
      media: legacyData.media,
      cultureCondition: legacyData.cultureCondition,
      lotNumber: legacyData.lotNumber,
      notes: legacyData.notes
    },
    researcherId: legacyData.researcherId,
    timestamps: {
      createdAt: legacyData.createdAt,
      updatedAt: legacyData.updatedAt
    }
  });
};
