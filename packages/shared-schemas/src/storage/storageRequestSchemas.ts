import { z } from 'zod';

import { GRID_SIZES } from '../constants/gridSizes';
import { VALIDATION_LIMITS } from '../constants/validationLimits';
import { patchText } from '../utils/stringFields';
import { GridConfigurationSchema } from './storageSchemas';

const TANK_NAME_MAX = VALIDATION_LIMITS.TANK.NAME_MAX_LENGTH;
const RACK_NAME_MAX = 200;
const LOCATION_MAX = 500;
const LABEL_MAX = 50;
const LAB_NAME_MAX = 200;
const COUNT_MAX = 100;

const count = z.number().int().positive().max(COUNT_MAX).optional();
const assignedUserId = z.string().min(1).nullish();

export const addTankRequestSchema = z.object({
  name: z.string().min(1, 'Tank name is required').max(TANK_NAME_MAX),
});

export const updateTankRequestSchema = z.object({
  name: z.string().min(1, 'Tank name is required').max(TANK_NAME_MAX).optional(),
  location: z.string().max(LOCATION_MAX).optional(),
  isActive: z.boolean().optional(),
});

export const addRacksRequestSchema = z.object({ count });

export const updateRackRequestSchema = z.object({
  name: z.string().min(1, 'Rack name is required').max(RACK_NAME_MAX).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const assignRackRequestSchema = z.object({ assignedUserId });

export const addBoxesRequestSchema = z.object({ count });

export const updateBoxGridRequestSchema = z
  .object({
    tankId: z.string().min(1),
    rackId: z.string().min(1).optional(),
    boxId: z.string().min(1).optional(),
    gridConfig: GridConfigurationSchema.refine(
      grid => GRID_SIZES.some(size => size.rows === grid.rows && size.cols === grid.cols),
      'Choose one of the standard box grid sizes'
    ),
  })
  .refine(data => !data.boxId || !!data.rackId, {
    message: 'rackId is required to change a single box',
    path: ['rackId'],
  });

export type UpdateBoxGridRequest = z.infer<typeof updateBoxGridRequestSchema>;

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
  fromUserId: z.string().min(1).optional(),
  toUserId: z.string().min(1, 'toUserId is required'),
});
