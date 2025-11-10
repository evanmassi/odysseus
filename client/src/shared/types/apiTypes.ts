/**
 * API-related types for consistent request/response handling
 */

import type { TubeData, UpdateTubeRequest } from './tubeTypes';
import type { ValidationError } from './validationTypes';

// Generic API response wrapper
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
  filters?: any;
  useCache?: boolean;
}

export interface LocationQuery {
  tankId: string;
  rackId: number;
  boxId?: string;
}

// WebSocket event types
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
