/**
 * Storage Request Schemas
 *
 * Zod validation for tank/rack/box/label write requests. Optional text is
 * trimmed (globally, via sanitizeStrings) and blank-normalized here at the
 * schema boundary, matching the equipment domain.
 */

import { z } from 'zod';

import { patchText } from '../utils/stringFields';
import { positionDisplayConfigSchema } from './positionSchemas';
import { GridConfigurationSchema } from './storageSchemas';

const NAME_MAX = 200;
const LOCATION_MAX = 500;
const LABEL_MAX = 50;
const LAB_NAME_MAX = 200;
const COUNT_MAX = 100;

const count = z.number().int().positive().max(COUNT_MAX).optional();
const assignedUserId = z.string().min(1).nullish();

export const addTankRequestSchema = z.object({
  name: z.string().min(1, 'Tank name is required').max(NAME_MAX),
});

export const updateTankRequestSchema = z.object({
  name: z.string().min(1, 'Tank name is required').max(NAME_MAX).optional(),
  location: z.string().max(LOCATION_MAX).optional(),
  isActive: z.boolean().optional(),
});

export const addRacksRequestSchema = z.object({ count });

export const updateRackRequestSchema = z.object({
  name: z.string().min(1, 'Rack name is required').max(NAME_MAX).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const assignRackRequestSchema = z.object({ assignedUserId });

export const addBoxesRequestSchema = z.object({ count });

export const updateBoxRequestSchema = z.object({
  name: z.string().min(1, 'Box name is required').max(NAME_MAX).optional(),
  gridConfig: GridConfigurationSchema.optional(),
  positionDisplay: positionDisplayConfigSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const assignBoxRequestSchema = z.object({ assignedUserId });

export const updateResourceLabelRequestSchema = z
  .object({
    resourceType: z.enum(['rack', 'box']),
    tankId: z.string().min(1),
    rackId: z.string().min(1),
    boxId: z.string().min(1).optional(),
    customLabel: patchText(LABEL_MAX),
  })
  .refine(data => data.resourceType !== 'box' || !!data.boxId, {
    message: 'boxId is required for box label updates',
    path: ['boxId'],
  });

export const updateSystemStorageRequestSchema = z.object({
  labName: z.string().min(1, 'Lab name is required').max(LAB_NAME_MAX),
});

export const initializeStorageRequestSchema = z.object({
  labName: z.string().min(1, 'Lab name is required').max(LAB_NAME_MAX),
  tankCount: z.number().int().positive().max(COUNT_MAX).optional(),
  racksPerTank: z.number().int().positive().max(COUNT_MAX).optional(),
  boxesPerRack: z.number().int().positive().max(COUNT_MAX).optional(),
});

export const bulkUnassignRequestSchema = z.object({
  fromUserId: z.string().min(1, 'fromUserId is required'),
});

export const bulkReassignRequestSchema = z.object({
  fromUserId: z.string().min(1, 'fromUserId is required'),
  toUserId: z.string().min(1, 'toUserId is required'),
});
