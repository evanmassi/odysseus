/**
 * API-related types for consistent request/response handling
 */

import type { TubeData, UpdateTubeRequest } from './Tube';
import type { ValidationError } from './Validation';

// Generic API response wrapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic default for flexible API response data types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  metadata?: {
    timestamp: string;
    requestId?: string;
    cacheHit?: boolean;
    duration?: number;
  };
}

// Tube-specific API types
export interface TubeAPIResponse extends APIResponse {
  tube?: TubeData;
  tubes?: TubeData[];
  pagination?: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// Types imported above for internal use only - not re-exported (tubeTypes.ts is the canonical source)

export interface TubeBulkUpdateRequest {
  updates: Array<{
    id: string;
    updates: UpdateTubeRequest;
  }>;
}

// Search and filter types
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic filters with varying field types
  filters?: any;
  useCache?: boolean;
}

export interface LocationQuery {
  tankId: string;
  rackId: number;
  boxId?: string;
}

// WebSocket event types
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic default for flexible WebSocket event data types
export interface SocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: string;
  userId?: string;
}

export interface TubeSocketEvents {
  tube_created: { tube: TubeData };
  tube_updated: { tube: TubeData };
  tube_deleted: { tubeId: string };
  tubes_bulk_updated: { tubes: TubeData[]; count: number };
}
