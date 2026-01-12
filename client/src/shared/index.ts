/**
 * Shared Module Public API - Clean Architecture
 *
 * Shared module containing only pure utilities, types, constants,
 * and generic UI primitives.
 *
 * NO DOMAIN IMPORTS - NO FRAMEWORK-SPECIFIC CODE - NO APPLICATION LOGIC
 */

// Pure utilities - no external dependencies
export * from './utils';

// Type definitions - type-only exports
export type {
  // API types
  APIResponse as ApiResponse,
  TubeAPIResponse,
  QueryOptions,
  // Tube types - specific exports to avoid conflicts
  TubeLocation,
  TubeSample,
  TubeTimestamps,
  // Form types
  FormFieldConfig,
  TubeFormConfig,
} from './types';

// WebSocket and query types from domain schemas
export type { WebSocketMessage, QueryParameters } from '@odysseus/shared-schemas';

// Configuration - environment and app config
export * from './config';

// Error classes and utilities
export * from './errors';

// Stores - shared application stores
export * from './stores';

// Generic UI components and primitives
export * from './ui';

// Note: Design system tokens accessible via './ui' re-export

// Client-side validation schemas - REMOVED (migrated to @odysseus/shared-schemas)

// Grid utilities
export * from './types/GridLayout';
