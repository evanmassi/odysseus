/**
 * Field Resolver Service - Moved from application layer
 */

// Import the authoritative FieldResolverHook interface from hooks layer
import type { FieldResolverHook } from '../hooks/useFieldResolver';
import type { FieldResolutionOptions } from '@domains/tubes/types/FieldResolver';


export interface PerformanceMetrics {
  totalResolutions: number;
  averageResolutionTime: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
}

export class FieldResolverService {
  static resolveField(tube: any, fieldKey: string, options?: FieldResolutionOptions): any {
    // Simple field resolution for legacy compatibility
    if (!tube) return undefined;
    
    // Handle nested field access (e.g., 'location.tankId')
    const keys = fieldKey.split('.');
    let value = tube;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return options?.defaultValue;
      }
    }
    
    return value;
  }

  static formatValue(value: any, fieldKey: string): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }

  static validateValue(value: any, fieldKey: string): boolean {
    // Basic validation - can be enhanced based on fieldKey
    return value !== null && value !== undefined && value !== '';
  }

  getFieldResolver(): FieldResolverHook {
    return {
      getValue: <T = any>(tube: any, fieldKey: string, options?: FieldResolutionOptions) => 
        FieldResolverService.resolveField(tube, fieldKey, options) as T,
      
      getValues: <T = any>(tubes: any[], fieldKey: string, options?: FieldResolutionOptions) => 
        tubes.map(tube => FieldResolverService.resolveField(tube, fieldKey, options) as T),
      
      hasValue: (tube: any, fieldKey: string) => {
        const value = FieldResolverService.resolveField(tube, fieldKey);
        return value !== undefined && value !== null && value !== '';
      },
      
      resolveField: <T = any>(tube: any, fieldKey: string) => ({
        value: FieldResolverService.resolveField(tube, fieldKey) as T,
        resolved: true,
        resolvedPath: fieldKey,
        exists: true
      }),
      
      getFieldPath: (fieldKey: string) => fieldKey,
      
      isValidField: (fieldKey: string) => true,
      
      getAvailableFields: () => [],
      
      validateConfiguration: () => {},
      
      resolver: null as any,
      
      metrics: {
        totalResolutions: 0,
        averageResolutionTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errorCount: 0
      } as PerformanceMetrics
    };
  }
}

// Application service singleton
let fieldResolverApplicationService: FieldResolverService | null = null;

export function getFieldResolverApplicationService(): FieldResolverService {
  if (!fieldResolverApplicationService) {
    fieldResolverApplicationService = new FieldResolverService();
  }
  return fieldResolverApplicationService;
}
