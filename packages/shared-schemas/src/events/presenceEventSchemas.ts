/**
 * Presence Socket Event Schemas
 *
 * WebSocket payload contracts for user online/offline status tracking.
 */

import { z } from 'zod';

export const presenceEventSchemas = {
  user_online: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
  user_offline: z.object({
    userId: z.string(),
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
  // Response to explicit request_presence — authoritative initial state
  presence_state: z.object({
    onlineUserIds: z.array(z.string()),
    timestamp: z.string(),
  }),
} as const;
