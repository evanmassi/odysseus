/**
 * Field Resolver React Hook - Application Layer
 *
 * Application layer integration that provides React components with access to
 * the field resolution domain service. This hook abstracts the domain service
 * complexity and provides a React-friendly interface for field access.
 *
 * Architecture Benefits:
 * - Clean separation between domain logic and presentation layer
 * - Consistent field access patterns across all React components
 * - Centralized dependency injection for field resolution service
 * - Performance optimization through memoization and caching
 * - Type-safe field access with TypeScript integration
 */

import { useCallback, useMemo, useRef } from 'react';

import { TubeFieldAccessService } from '@domains/tubes/services/TubeFieldAccessService';
import { env } from '@shared/config';
import { DomainError } from '@shared/domain/errors/DomainError';
import { logger } from '@shared/infrastructure/logger';

import { getFieldResolverApplicationService } from '../services/FieldResolverService';

import type { ValidFieldValue } from '@app/types/fieldTypeMapping';
import type {
  FieldResolver,
  FieldResolutionOptions,
  FieldResolutionResult,
} from '@domains/tubes/types/FieldResolver';
import type { ValidTubeFieldKey } from '@infra/configuration/fieldPathMapping';
import type { TubeData } from '@shared/types/TubeTypes';

/**
 * Hook configuration options
 */
export interface UseFieldResolverOptions {
  /** Custom field resolver instance (for testing or specialized configurations) */
  resolver?: FieldResolver;
  /** Enable performance monitoring and logging */
  enableMetrics?: boolean;
  /** Default options for field resolution */
  defaultResolutionOptions?: FieldResolutionOptions;
}

/**
 * Hook return interface - React-optimized field resolution API
 * Extends FieldResolver to ensure full compatibility
 */
export interface FieldResolverHook extends FieldResolver {
  /** Resolve a single field value from tube data */
  getValue: <T = ValidFieldValue>(
    tube: TubeData,
    fieldKey: ValidTubeFieldKey | string,
    options?: FieldResolutionOptions
  ) => T | undefined;

  /** Resolve field values from multiple tube data objects */
  getValues: <T = ValidFieldValue>(
    tubes: TubeData[],
    fieldKey: ValidTubeFieldKey | string,
    options?: FieldResolutionOptions
  ) => (T | undefined)[];

  /** Check if a field has a meaningful value */
  hasValue: (tube: TubeData, fieldKey: ValidTubeFieldKey | string) => boolean;

  /** Get detailed field resolution information */
  resolveField: <T = ValidFieldValue>(
    tube: TubeData,
    fieldKey: ValidTubeFieldKey | string
  ) => FieldResolutionResult<T>;

  /** Get the nested path for a field key */
  getFieldPath: (fieldKey: ValidTubeFieldKey | string) => string;

  /** Check if a field key is valid */
  isValidField: (fieldKey: string) => boolean;

  /** Get all available field keys */
  getAvailableFields: () => string[];

  /** Access to the underlying resolver instance */
  resolver: FieldResolver;

  /** Performance metrics (if enabled) */
  metrics?: ReturnType<TubeFieldAccessService['getPerformanceMetrics']>;
}

/**
 * React Hook: useFieldResolver
 *
 * Provides React components with access to field resolution capabilities.
 * Automatically handles memoization and performance optimization for React
 * rendering cycles.
 *
 * Usage Examples:
 * ```tsx
 * function TubeDisplay({ tube }: { tube: TubeData }) {
 *   const { getValue, hasValue } = useFieldResolver();
 *
 *   const cellType = getValue(tube, 'cellType');
 *   const hasConcentration = hasValue(tube, 'concentration');
 *
 *   return (
 *     <div>
 *       <div>Cell Type: {cellType || 'Unknown'}</div>
 *       {hasConcentration && <div>Has concentration data</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFieldResolver(options: UseFieldResolverOptions = {}): FieldResolverHook {
  const {
    resolver: customResolver,
    enableMetrics = false,
    defaultResolutionOptions = {},
  } = options;

  // Get resolver instance (memoized for performance)
  const resolver = useMemo(() => {
    if (customResolver) {
      return customResolver;
    }

    try {
      // Use the properly initialized field resolver service
      const fieldResolverService = getFieldResolverApplicationService();
      return fieldResolverService.getFieldResolver();
    } catch (error) {
      throw new DomainError(
        'Field resolver system not initialized. Ensure bootstrap process completed before using useFieldResolver.',
        'RESOLVER_NOT_INITIALIZED',
        { originalError: error }
      );
    }
  }, [customResolver]);

  // Ref to track if metrics are enabled (avoid re-creating callbacks)
  const metricsEnabledRef = useRef(enableMetrics);
  metricsEnabledRef.current = enableMetrics;

  // Memoized getValue function with default options merged
  const getValue = useCallback(
    <T = ValidFieldValue>(
      tube: TubeData,
      fieldKey: ValidTubeFieldKey | string,
      options: FieldResolutionOptions = {}
    ): T | undefined => {
      const mergedOptions = { ...defaultResolutionOptions, ...options };

      try {
        return resolver.getValue<T>(tube, fieldKey, mergedOptions);
      } catch (error) {
        // In React context, we generally want to handle errors gracefully
        if (env.isDev()) {
          logger.warn(`Field resolution failed for key '${fieldKey}'`, { error, fieldKey });
        }

        // Return default value instead of throwing in React components
        return mergedOptions.defaultValue as T | undefined;
      }
    },
    [resolver, defaultResolutionOptions]
  );

  // Memoized getValues function for bulk operations
  const getValues = useCallback(
    <T = ValidFieldValue>(
      tubes: TubeData[],
      fieldKey: ValidTubeFieldKey | string,
      options: FieldResolutionOptions = {}
    ): (T | undefined)[] => {
      const mergedOptions = { ...defaultResolutionOptions, ...options };

      try {
        return resolver.getValues<T>(tubes, fieldKey, mergedOptions);
      } catch (error) {
        if (env.isDev()) {
          logger.warn(`Bulk field resolution failed for key '${fieldKey}'`, { error, fieldKey });
        }

        // Return array of default values on error
        return tubes.map(() => mergedOptions.defaultValue as T | undefined);
      }
    },
    [resolver, defaultResolutionOptions]
  );

  // Memoized hasValue function
  const hasValue = useCallback(
    (tube: TubeData, fieldKey: ValidTubeFieldKey | string): boolean => {
      try {
        return resolver.hasValue(tube, fieldKey);
      } catch (error) {
        if (env.isDev()) {
          logger.warn(`hasValue check failed for key '${fieldKey}'`, { error, fieldKey });
        }
        return false;
      }
    },
    [resolver]
  );

  // Memoized resolveField function for detailed resolution
  const resolveField = useCallback(
    <T = ValidFieldValue>(
      tube: TubeData,
      fieldKey: ValidTubeFieldKey | string
    ): FieldResolutionResult<T> => {
      try {
        return resolver.resolveField<T>(tube, fieldKey);
      } catch (error) {
        if (env.isDev()) {
          logger.warn(`Field resolution details failed for key '${fieldKey}'`, { error, fieldKey });
        }

        return {
          value: undefined,
          resolved: false,
          resolvedPath: '',
          exists: false,
        };
      }
    },
    [resolver]
  );

  // Memoized getFieldPath function
  const getFieldPath = useCallback(
    (fieldKey: ValidTubeFieldKey | string): string => {
      try {
        return resolver.getFieldPath(fieldKey);
      } catch (error) {
        if (env.isDev()) {
          logger.warn(`getFieldPath failed for key '${fieldKey}'`, { error, fieldKey });
        }
        return fieldKey; // Fallback to field key itself
      }
    },
    [resolver]
  );

  // Memoized isValidField function
  const isValidField = useCallback(
    (fieldKey: string): boolean => {
      return resolver.isValidField(fieldKey);
    },
    [resolver]
  );

  // Memoized getAvailableFields function
  const getAvailableFields = useCallback((): string[] => {
    return resolver.getAvailableFields();
  }, [resolver]);

  // Get performance metrics if enabled and supported
  const metrics = useMemo(() => {
    if (!enableMetrics) return undefined;

    if (resolver instanceof TubeFieldAccessService) {
      return resolver.getPerformanceMetrics();
    }

    return undefined;
  }, [resolver, enableMetrics]);

  return {
    getValue,
    getValues,
    hasValue,
    resolveField,
    getFieldPath,
    isValidField,
    getAvailableFields,
    validateConfiguration: () => resolver.validateConfiguration(),
    resolver,
    metrics,
  };
}

/**
 * Field Resolver Props Interface
 * For components that need field resolver capabilities through props
 */
export interface WithFieldResolverProps {
  fieldResolver: FieldResolverHook;
}

/**
 * Development utilities for debugging field resolution
 */
export const FieldResolverDevUtils = {
  /**
   * Log all field resolutions for a tube (development only)
   */
  logAllFields(
    tube: TubeData,
    resolver: FieldResolverHook,
    _prefix: string = 'Field Resolution'
  ): void {
    if (!env.isDev()) return;

    const fields = resolver.getAvailableFields();
    const results: Record<string, unknown> = {};

    fields.forEach(fieldKey => {
      const resolution = resolver.resolveField(tube, fieldKey);
      results[fieldKey] = {
        value: resolution.value,
        resolved: resolution.resolved,
        path: resolution.resolvedPath,
        exists: resolution.exists,
      };
    });
  },

  /**
   * Validate that all expected fields can be resolved
   */
  validateFieldResolution(
    tube: TubeData,
    resolver: FieldResolverHook,
    expectedFields: (ValidTubeFieldKey | string)[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    expectedFields.forEach(fieldKey => {
      if (!resolver.isValidField(fieldKey)) {
        errors.push(`Invalid field key: ${fieldKey}`);
        return;
      }

      try {
        const resolution = resolver.resolveField(tube, fieldKey);
        if (!resolution.resolved && resolution.exists) {
          errors.push(`Field '${fieldKey}' exists but could not be resolved`);
        }
      } catch (error) {
        errors.push(
          `Field '${fieldKey}' threw error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
