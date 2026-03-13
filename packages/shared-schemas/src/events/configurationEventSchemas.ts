/**
 * Configuration Socket Event Schemas
 *
 * WebSocket payload contracts for real-time storage configuration change notifications.
 */

import { z } from 'zod';

export const configurationEventSchemas = {
  configuration_updated: z.object({
    eventTypes: z.array(z.string()),
    eventCount: z.number(),
    updatedAt: z.string(),
    changedBy: z.string(),
  }),
} as const;
