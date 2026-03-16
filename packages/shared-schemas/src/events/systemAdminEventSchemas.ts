/**
 * System Admin Socket Event Schemas
 *
 * WebSocket payload contracts for real-time system administration notifications.
 */

import { z } from 'zod';

export const systemAdminEventSchemas = {
  lab_data_changed: z.object({
    labId: z.string(),
    trigger: z.string(),
    timestamp: z.string(),
  }),
} as const;
