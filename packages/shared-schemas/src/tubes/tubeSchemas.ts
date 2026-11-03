import { z } from 'zod';
import { dateField } from '../utils/dateFields';
import {
  CELL_CONCENTRATION_UNITS,
  concentrationPreprocessor,
  concentrationPreprocessorNullable,
  concentrationUnitRefinement,
} from '../units';
import {
  datePreprocessor,
  datePreprocessorNullable,
  optionalFromEmpty,
  nullableOptionalFromEmpty,
} from './tubeValidation';
import { VALIDATION_LIMITS } from '../constants/validationLimits';

export const CONCENTRATION_UNITS = CELL_CONCENTRATION_UNITS;
export type ConcentrationUnit = (typeof CONCENTRATION_UNITS)[number];

export const tubeLocationSchema = z.object({
  tankId: z.string().min(1, 'Tank ID is required'),
  rackId: z.string().min(1, 'Rack ID is required'),
  boxId: z.string().min(1, 'Box ID is required'),
  position: z
    .number()
    .int()
    .min(1)
    .max(
      VALIDATION_LIMITS.BOX.MAX_POSITIONS,
      `Position must be between 1 and ${VALIDATION_LIMITS.BOX.MAX_POSITIONS}`
    ),
});

const concentrationUnitSchema = z.enum(CONCENTRATION_UNITS);

export const tubeSampleSchema = z.object({
  cellType: z.string().optional(),
  species: z.string().optional(),
  donorInternalId: z.string().optional(),
  donorSourceId: z.string().optional(),
  concentration: z.number().optional(),
  concentrationUnit: concentrationUnitSchema.optional(),
  date: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
      z.string().datetime('Invalid date format'),
    ])
    .optional(),
  mediaType: z.string().optional(),
  mediaSupplements: z.string().optional(),
  mediaSelection: z.string().optional(),
  cultureCondition: z.string().optional(),
  lotNumber: z.string().optional(),
  source: z.string().optional(),
  catalogNumber: z.string().optional(),
  passageNumber: z.number().int().min(0).max(999).optional(),
  notes: z.string().optional(),
});

export type TubeSample = z.infer<typeof tubeSampleSchema>;

const tubeTimestampsSchema = z.object({
  createdAt: dateField,
  updatedAt: dateField,
});

export const tubeDataSchema = z.object({
  id: z.string().min(1, 'Tube ID is required'),
  location: tubeLocationSchema,
  sample: tubeSampleSchema,
  researcherId: z.string().optional(),
  createdByName: z.string().optional(),
  timestamps: tubeTimestampsSchema,
  version: z.number().int().positive(),
  isLocked: z.boolean().optional(),
  lockedBy: z.string().optional(),
  lockNote: z.string().max(100).optional(),
  lockedAt: z.string().datetime().optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
  labId: z.string().optional(),
  isSeeded: z.boolean(),
});

export const rackTubeSchema = tubeSampleSchema
  .pick({
    cellType: true,
    donorInternalId: true,
    donorSourceId: true,
    lotNumber: true,
    cultureCondition: true,
  })
  .extend({ boxId: z.string(), position: z.number().int().min(1) });
export type RackTube = z.infer<typeof rackTubeSchema>;

export const tubeLocationCountSchema = z.object({
  tankId: z.string(),
  rackId: z.string(),
  boxId: z.string(),
  count: z.number().int().min(0),
});
export type TubeLocationCount = z.infer<typeof tubeLocationCountSchema>;

const createTubeRequestSampleSchema = concentrationUnitRefinement(
  z.object({
    cellType: z.preprocess(
      val => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed || '';
        }
        return val;
      },
      z.string().min(1, 'Cell type is required')
    ),
    species: optionalFromEmpty(z.string()),
    donorInternalId: optionalFromEmpty(z.string()),
    donorSourceId: optionalFromEmpty(z.string()),
    concentration: concentrationPreprocessor,
    concentrationUnit: optionalFromEmpty(concentrationUnitSchema),
    date: datePreprocessor,
    mediaType: optionalFromEmpty(z.string()),
    mediaSupplements: optionalFromEmpty(z.string()),
    mediaSelection: optionalFromEmpty(z.string()),
    cultureCondition: optionalFromEmpty(z.string()),
    lotNumber: optionalFromEmpty(z.string()),
    source: optionalFromEmpty(z.string()),
    catalogNumber: optionalFromEmpty(z.string()),
    passageNumber: z.preprocess(val => {
      if (val === '' || val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? val : num;
      }
      return val;
    }, z.number().int().min(0).max(999).optional()),
    notes: optionalFromEmpty(z.string()),
  })
);

export const createTubeRequestSchema = z.object({
  location: tubeLocationSchema,
  sample: createTubeRequestSampleSchema,
  researcherId: optionalFromEmpty(z.string()),
});

// PITFALL: tri-state PATCH — undefined skips a field, null or '' clears it; cellType ignores ''.
const tubeUpdateSampleSchema = concentrationUnitRefinement(
  z.object({
    cellType: z.preprocess(
      val => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed || undefined;
        }
        return val;
      },
      z.union([z.string().min(1, 'Cell type is required'), z.undefined()])
    ),
    species: nullableOptionalFromEmpty(z.string()),
    donorInternalId: nullableOptionalFromEmpty(z.string()),
    donorSourceId: nullableOptionalFromEmpty(z.string()),
    concentration: concentrationPreprocessorNullable,
    concentrationUnit: nullableOptionalFromEmpty(concentrationUnitSchema),
    date: datePreprocessorNullable,
    mediaType: nullableOptionalFromEmpty(z.string()),
    mediaSupplements: nullableOptionalFromEmpty(z.string()),
    mediaSelection: nullableOptionalFromEmpty(z.string()),
    cultureCondition: nullableOptionalFromEmpty(z.string()),
    lotNumber: nullableOptionalFromEmpty(z.string()),
    source: nullableOptionalFromEmpty(z.string()),
    catalogNumber: nullableOptionalFromEmpty(z.string()),
    passageNumber: z.preprocess(val => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (val === '') return null;
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? val : num;
      }
      return val;
    }, z.number().int().min(0).max(999).nullable().optional()),
    notes: nullableOptionalFromEmpty(z.string()),
  })
);

export const updateTubeRequestSchema = z.object({
  location: tubeLocationSchema.partial().optional(),
  sample: tubeUpdateSampleSchema.optional(),
  researcherId: nullableOptionalFromEmpty(z.string()),
  lockNote: z.string().max(100).optional(),
});

export const TUBE_FILTERABLE_FIELDS = [
  'tankId',
  'rackId',
  'boxId',
  'cellType',
  'lotNumber',
  'donorInternalId',
  'donorSourceId',
  'cultureCondition',
  'species',
  'source',
] as const;

export type TubeFilterableField = (typeof TUBE_FILTERABLE_FIELDS)[number];

export const TUBE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'position',
  'researcherId',
  'cellType',
] as const;

export const tubeFilterOptionsResponseSchema = z.object({
  tankId: z.array(z.string()).optional(),
  rackId: z.array(z.string()).optional(),
  boxId: z.array(z.string()).optional(),
  cellType: z.array(z.string()).optional(),
  lotNumber: z.array(z.string()).optional(),
  donorInternalId: z.array(z.string()).optional(),
  donorSourceId: z.array(z.string()).optional(),
  cultureCondition: z.array(z.string()).optional(),
  species: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
});

export type TubeFilterOptions = z.infer<typeof tubeFilterOptionsResponseSchema>;

export type TubeData = z.infer<typeof tubeDataSchema>;
export type TubeLocation = z.infer<typeof tubeLocationSchema>;

export type CreateTubeRequest = z.output<typeof createTubeRequestSchema>;
export type UpdateTubeRequest = z.output<typeof updateTubeRequestSchema>;

export type CreateTubeFormInput = z.input<typeof createTubeRequestSchema>;
export type UpdateTubeFormInput = z.input<typeof updateTubeRequestSchema>;

export const bulkDeleteResponseSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

export type BulkDeleteResponse = z.infer<typeof bulkDeleteResponseSchema>;

export const pasteTubesResponseSchema = z.object({
  created: z.array(tubeDataSchema),
  failed: z.array(
    z.object({
      index: z.number(),
      request: createTubeRequestSchema,
      error: z.string(),
    })
  ),
});

export type PasteTubesResponse = z.infer<typeof pasteTubesResponseSchema>;

export const bulkUpdateResponseSchema = z.object({
  updated: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

export type BulkUpdateResponse = z.infer<typeof bulkUpdateResponseSchema>;

export const bulkFetchResponseSchema = z.array(tubeDataSchema);

export const bulkMoveRequestSchema = z.object({
  moves: z
    .array(
      z.object({
        tubeId: z.string().min(1),
        version: z.number().int().positive(),
        destination: tubeLocationSchema,
      })
    )
    .min(1, 'At least one move is required')
    .max(100),
});

export const bulkMoveResponseSchema = z.object({
  moved: z.array(tubeDataSchema),
  failed: z.array(z.object({ tubeId: z.string(), error: z.string() })),
});

export type BulkMoveRequest = z.infer<typeof bulkMoveRequestSchema>;
export type BulkMoveResponse = z.infer<typeof bulkMoveResponseSchema>;
