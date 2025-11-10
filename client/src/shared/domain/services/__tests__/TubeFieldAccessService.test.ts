/**
 * TubeFieldAccessService Unit Tests
 * 
 * Comprehensive test suite for the field resolution domain service.
 * Tests all business logic, error handling, and performance characteristics.
 */

import { TubeFieldAccessService } from '@domains/tubes/services/TubeFieldAccessService';

import { DomainError, FieldResolutionError, FieldPathError } from '../../errors/DomainError';

import type { FieldPathMapping } from '@domains/tubes/types/FieldResolver';
import type { TubeData } from '@shared/types/tubeTypes';


// Test data fixtures
const mockTubeData: TubeData = {
  id: 'test-tube-1',
  location: {
    tankId: 'tank-1',
    rackId: '1',
    boxId: 'A',
    position: 1
  },
  sample: {
    cellType: 'HeLa',
    donorInternalId: 'D001',
    donorSourceId: 'EXT-001',
    concentration: 1000000,
    concentrationUnit: 'c/mL',
    date: '2025-01-01',
    media: {
      type: 'DMEM',
      supplements: '',
      selection: ''
    },
    cultureCondition: '37C',
    lotNumber: 'LOT001',
    notes: 'Test sample'
  },
  researcherId: 'researcher_test_001',  timestamps: {
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-02T15:30:00Z')
  }
};

const testFieldMapping: FieldPathMapping = {
  'cellType': 'sample.cellType',
  'donorInternalId': 'sample.donorInternalId',
  'concentration': 'sample.concentration',
  'tankId': 'location.tankId',
  'position': 'location.position',
  'researcherId': 'researcherId',  'id': 'id',
  'createdAt': 'timestamps.createdAt'
};

describe('TubeFieldAccessService', () => {
  let service: TubeFieldAccessService;

  beforeEach(() => {
    service = new TubeFieldAccessService(testFieldMapping);
  });

  describe('Constructor and Configuration Validation', () => {
    test('should create service with valid configuration', () => {
      expect(service).toBeInstanceOf(TubeFieldAccessService);
      expect(service.getAvailableFields()).toEqual(Object.keys(testFieldMapping).sort());
    });

    test('should throw error for empty configuration', () => {
      expect(() => new TubeFieldAccessService({})).toThrow(DomainError);
    });

    test('should throw error for null configuration', () => {
      expect(() => new TubeFieldAccessService(null as any)).toThrow(DomainError);
    });

    test('should throw error for invalid path format', () => {
      const invalidMapping = { 'test': 'invalid..path' };
      expect(() => new TubeFieldAccessService(invalidMapping)).toThrow(DomainError);
    });

    test('should throw error for empty field key', () => {
      const invalidMapping = { '': 'valid.path' };
      expect(() => new TubeFieldAccessService(invalidMapping)).toThrow(DomainError);
    });

    test('should throw error for empty path', () => {
      const invalidMapping = { 'validKey': '' };
      expect(() => new TubeFieldAccessService(invalidMapping)).toThrow(DomainError);
    });
  });

  describe('getValue - Single Field Resolution', () => {
    test('should resolve nested sample fields correctly', () => {
      expect(service.getValue(mockTubeData, 'cellType')).toBe('HeLa');
      expect(service.getValue(mockTubeData, 'donorInternalId')).toBe('D001');
      expect(service.getValue(mockTubeData, 'concentration')).toBe(1000000);
    });

    test('should resolve nested location fields correctly', () => {
      expect(service.getValue(mockTubeData, 'tankId')).toBe('tank-1');
      expect(service.getValue(mockTubeData, 'position')).toBe(1);
    });

    test('should resolve direct fields correctly', () => {
      expect(service.getValue(mockTubeData, 'researcherId')).toBe('researcher_test_001');      expect(service.getValue(mockTubeData, 'id')).toBe('test-tube-1');
    });

    test('should resolve timestamp fields correctly', () => {
      const createdAt = service.getValue(mockTubeData, 'createdAt');
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt).toEqual(mockTubeData.timestamps.createdAt);
    });

    test('should return undefined for missing optional fields', () => {
      const dataWithMissingField = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: undefined
        }
      };
      
      expect(service.getValue(dataWithMissingField as any, 'cellType')).toBeUndefined();
    });

    test('should return default value for missing fields when specified', () => {
      const dataWithMissingField = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: undefined
        }
      };
      
      const result = service.getValue(dataWithMissingField as any, 'cellType', {
        defaultValue: 'Unknown'
      });
      
      expect(result).toBe('Unknown');
    });

    test('should apply transformation function when provided', () => {
      const result = service.getValue(mockTubeData, 'cellType', {
        transform: (value: string) => value.toUpperCase()
      });
      
      expect(result).toBe('HELA');
    });

    test('should throw FieldResolutionError for invalid field key', () => {
      expect(() => service.getValue(mockTubeData, 'invalidField'))
        .toThrow(FieldResolutionError);
    });

    test('should throw error when throwOnMissing is true and field is missing', () => {
      const dataWithMissingField = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: undefined
        }
      };
      
      expect(() => service.getValue(dataWithMissingField as any, 'cellType', {
        throwOnMissing: true
      })).toThrow(FieldPathError);
    });

    test('should handle null data gracefully', () => {
      expect(() => service.getValue(null as any, 'cellType')).toThrow(DomainError);
    });

    test('should handle invalid field key type', () => {
      expect(() => service.getValue(mockTubeData, null as any)).toThrow(DomainError);
      expect(() => service.getValue(mockTubeData, '' as any)).toThrow(DomainError);
    });
  });

  describe('getValues - Bulk Field Resolution', () => {
    const mockTubeArray: TubeData[] = [
      mockTubeData,
      {
        ...mockTubeData,
        id: 'test-tube-2',
        sample: {
          ...mockTubeData.sample,
          cellType: 'MCF7'
        }
      },
      {
        ...mockTubeData,
        id: 'test-tube-3',
        sample: {
          ...mockTubeData.sample,
          cellType: 'A549'
        }
      }
    ];

    test('should resolve field values from multiple tubes', () => {
      const cellTypes = service.getValues(mockTubeArray, 'cellType');
      expect(cellTypes).toEqual(['HeLa', 'MCF7', 'A549']);
    });

    test('should handle mixed missing values in array', () => {
      const mixedArray = [
        mockTubeData,
        { ...mockTubeData, sample: { ...mockTubeData.sample, cellType: undefined } } as any
      ];
      
      const cellTypes = service.getValues(mixedArray, 'cellType');
      expect(cellTypes).toEqual(['HeLa', undefined]);
    });

    test('should apply transformation to all values', () => {
      const cellTypes = service.getValues(mockTubeArray, 'cellType', {
        transform: (value: string) => value?.toLowerCase()
      });
      
      expect(cellTypes).toEqual(['hela', 'mcf7', 'a549']);
    });

    test('should return default values for missing fields', () => {
      const mixedArray = [
        mockTubeData,
        { ...mockTubeData, sample: { ...mockTubeData.sample, cellType: undefined } } as any
      ];
      
      const cellTypes = service.getValues(mixedArray, 'cellType', {
        defaultValue: 'Unknown'
      });
      
      expect(cellTypes).toEqual(['HeLa', 'Unknown']);
    });

    test('should throw error for invalid field key', () => {
      expect(() => service.getValues(mockTubeArray, 'invalidField'))
        .toThrow(FieldResolutionError);
    });

    test('should throw error for non-array input', () => {
      expect(() => service.getValues(mockTubeData as any, 'cellType'))
        .toThrow(DomainError);
    });
  });

  describe('hasValue - Value Existence Check', () => {
    test('should return true for fields with meaningful values', () => {
      expect(service.hasValue(mockTubeData, 'cellType')).toBe(true);
      expect(service.hasValue(mockTubeData, 'concentration')).toBe(true);
      expect(service.hasValue(mockTubeData, 'researcherId')).toBe(true);    });

    test('should return false for undefined values', () => {
      const dataWithUndefined = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: undefined
        }
      };
      
      expect(service.hasValue(dataWithUndefined as any, 'cellType')).toBe(false);
    });

    test('should return false for null values', () => {
      const dataWithNull = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: null
        }
      };
      
      expect(service.hasValue(dataWithNull as any, 'cellType')).toBe(false);
    });

    test('should return false for empty string values', () => {
      const dataWithEmpty = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: ''
        }
      };
      
      expect(service.hasValue(dataWithEmpty as any, 'cellType')).toBe(false);
    });

    test('should return false for invalid field keys', () => {
      expect(service.hasValue(mockTubeData, 'invalidField')).toBe(false);
    });
  });

  describe('getFieldPath - Path Resolution', () => {
    test('should return correct path for valid field keys', () => {
      expect(service.getFieldPath('cellType')).toBe('sample.cellType');
      expect(service.getFieldPath('tankId')).toBe('location.tankId');
      expect(service.getFieldPath('researcherId')).toBe('researcherId');    });

    test('should throw FieldResolutionError for invalid field keys', () => {
      expect(() => service.getFieldPath('invalidField')).toThrow(FieldResolutionError);
    });
  });

  describe('isValidField - Field Validation', () => {
    test('should return true for valid field keys', () => {
      expect(service.isValidField('cellType')).toBe(true);
      expect(service.isValidField('researcherId')).toBe(true);    });

    test('should return false for invalid field keys', () => {
      expect(service.isValidField('invalidField')).toBe(false);
      expect(service.isValidField('')).toBe(false);
    });
  });

  describe('resolveField - Detailed Resolution', () => {
    test('should return complete resolution metadata for existing fields', () => {
      const result = service.resolveField(mockTubeData, 'cellType');
      
      expect(result).toEqual({
        value: 'HeLa',
        resolved: true,
        resolvedPath: 'sample.cellType',
        exists: true
      });
    });

    test('should return metadata for missing fields', () => {
      const dataWithMissingField = {
        ...mockTubeData,
        sample: {
          ...mockTubeData.sample,
          cellType: undefined
        }
      };
      
      const result = service.resolveField(dataWithMissingField as any, 'cellType');
      
      expect(result.resolved).toBe(true); // Path exists but value is undefined
      expect(result.exists).toBe(true);
      expect(result.value).toBeUndefined();
    });
  });

  describe('getAvailableFields - Field Enumeration', () => {
    test('should return all configured field keys sorted', () => {
      const fields = service.getAvailableFields();
      const expectedFields = Object.keys(testFieldMapping).sort();
      
      expect(fields).toEqual(expectedFields);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics', () => {
      const initialMetrics = service.getPerformanceMetrics();
      expect(initialMetrics.totalResolutions).toBe(0);

      service.getValue(mockTubeData, 'cellType');
      service.getValue(mockTubeData, 'researcherId');
      const updatedMetrics = service.getPerformanceMetrics();
      expect(updatedMetrics.totalResolutions).toBe(2);
      expect(updatedMetrics.averageResolutionTime).toBeGreaterThan(0);
    });

    test('should reset metrics correctly', () => {
      service.getValue(mockTubeData, 'cellType');
      expect(service.getPerformanceMetrics().totalResolutions).toBe(1);
      
      service.resetMetrics();
      expect(service.getPerformanceMetrics().totalResolutions).toBe(0);
    });

    test('should cache compiled paths for performance', () => {
      service.getValue(mockTubeData, 'cellType'); // Cache miss
      
      const metrics2 = service.getPerformanceMetrics();
      service.getValue(mockTubeData, 'cellType'); // Cache hit
      
      const metrics3 = service.getPerformanceMetrics();
      
      expect(metrics3.cacheHits).toBeGreaterThan(metrics2.cacheHits);
      expect(metrics3.cacheMisses).toBe(metrics2.cacheMisses);
    });

    test('should clear cache correctly', () => {
      service.getValue(mockTubeData, 'cellType'); // Populate cache
      service.clearCache();

      service.getValue(mockTubeData, 'cellType'); // Should be cache miss after clear
      
      const finalMetrics = service.getPerformanceMetrics();
      expect(finalMetrics.cacheMisses).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle deeply nested missing paths', () => {
      const dataWithMissingNested = {
        id: 'test',
        location: null,
        sample: mockTubeData.sample,
        researcherId: 'researcher_test_001',        timestamps: mockTubeData.timestamps
      };

      expect(service.getValue(dataWithMissingNested as any, 'tankId')).toBeUndefined();
    });

    test('should handle circular references safely', () => {
      const circularData: any = {
        id: 'test',
        location: mockTubeData.location,
        sample: mockTubeData.sample,
        researcherId: 'researcher_test_001',        timestamps: mockTubeData.timestamps
      };
      circularData.self = circularData;

      // Should not cause infinite recursion
      expect(service.getValue(circularData, 'researcherId')).toBe('researcher_test_001');    });

    test('should maintain defensive copying of configuration', () => {
      const originalMapping = { ...testFieldMapping };
      const service = new TubeFieldAccessService(originalMapping);
      
      // Modify original mapping
      originalMapping['newField'] = 'new.path';
      
      // Service should not be affected
      expect(service.isValidField('newField')).toBe(false);
    });
  });

  describe('Factory Functions and Singleton', () => {
    test('should create service using factory function', () => {
      const { createTubeFieldAccessService } = require('../TubeFieldAccessService');
      const factoryService = createTubeFieldAccessService(testFieldMapping);
      
      expect(factoryService).toBeInstanceOf(TubeFieldAccessService);
      expect(factoryService.getValue(mockTubeData, 'cellType')).toBe('HeLa');
    });

    test('should provide singleton default service', () => {
      const { getDefaultTubeFieldAccessService } = require('../TubeFieldAccessService');
      const service1 = getDefaultTubeFieldAccessService(testFieldMapping);
      const service2 = getDefaultTubeFieldAccessService();
      
      expect(service1).toBe(service2); // Same instance
    });

    test('should reset default singleton', () => {
      const { 
        getDefaultTubeFieldAccessService, 
        resetDefaultTubeFieldAccessService 
      } = require('../TubeFieldAccessService');
      
      const service1 = getDefaultTubeFieldAccessService(testFieldMapping);
      resetDefaultTubeFieldAccessService();
      const service2 = getDefaultTubeFieldAccessService(testFieldMapping);
      
      expect(service1).not.toBe(service2); // Different instances after reset
    });
  });
});
