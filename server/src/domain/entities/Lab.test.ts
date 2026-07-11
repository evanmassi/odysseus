/**
 * Lab Entity Tests
 */

import { Lab } from './Lab';
import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';

describe('Lab', () => {
  describe('create', () => {
    it('should create a lab with generated id and slug', () => {
      const lab = Lab.create('My Research Lab');
      expect(lab.id).toMatch(/^lab_/);
      expect(lab.name).toBe('My Research Lab');
      expect(lab.slug).toBe('my-research-lab');
      expect(lab.isActive).toBe(true);
      expect(lab.createdAt).toBeInstanceOf(Date);
      expect(lab.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate slug from name with special characters', () => {
      const lab = Lab.create('Lab #1 (Main)');
      expect(lab.slug).toBe('lab-1-main');
    });

    it('should trim leading/trailing hyphens from slug', () => {
      const lab = Lab.create('  --Test Lab--  ');
      expect(lab.slug).toBe('test-lab');
    });

    it('should collapse multiple special chars into single hyphen', () => {
      const lab = Lab.create('Lab   &&&   Test');
      expect(lab.slug).toBe('lab-test');
    });

    it('should throw for empty name', () => {
      expect(() => Lab.create('')).toThrow('Lab name is required');
    });

    it('should throw for whitespace-only name', () => {
      expect(() => Lab.create('   ')).toThrow('Lab name is required');
    });

    it('should throw for name exceeding 200 characters', () => {
      expect(() => Lab.create('x'.repeat(201))).toThrow('Lab name cannot exceed 200 characters');
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should reconstitute from data preserving all fields', () => {
      const original = Lab.create('Test Lab');
      const data = original.toData();
      const restored = Lab.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.slug).toBe(original.slug);
      expect(restored.isActive).toBe(original.isActive);
      expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    });
  });

  describe('activate / deactivate', () => {
    it('should deactivate an active lab', () => {
      const lab = Lab.create('Test');
      expect(lab.isActive).toBe(true);
      lab.deactivate();
      expect(lab.isActive).toBe(false);
    });

    it('should activate a deactivated lab', () => {
      const lab = Lab.create('Test');
      lab.deactivate();
      lab.activate();
      expect(lab.isActive).toBe(true);
    });

    it('should update updatedAt on state change', () => {
      const lab = Lab.create('Test');
      const before = lab.updatedAt;
      // Small delay to ensure time difference
      lab.deactivate();
      expect(lab.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('updateName', () => {
    it('should update name and regenerate slug', () => {
      const lab = Lab.create('Old Name');
      lab.updateName('New Name');
      expect(lab.name).toBe('New Name');
      expect(lab.slug).toBe('new-name');
    });

    it('should throw for empty name', () => {
      const lab = Lab.create('Test');
      expect(() => lab.updateName('')).toThrow('Lab name is required');
    });

    it('should throw for name exceeding 200 characters', () => {
      const lab = Lab.create('Test');
      expect(() => lab.updateName('x'.repeat(201))).toThrow('Lab name cannot exceed 200 characters');
    });
  });

  describe('createDemo', () => {
    it('should create a demo lab with default limits', () => {
      const lab = Lab.createDemo('Demo Lab');
      expect(lab.id).toMatch(/^lab_/);
      expect(lab.name).toBe('Demo Lab');
      expect(lab.isDemo).toBe(true);
      expect(lab.isActive).toBe(true);
      expect(lab.demoLimits).toEqual(DEMO_LIMITS_DEFAULTS);
    });

    it('should not be demo when created normally', () => {
      const lab = Lab.create('Normal Lab');
      expect(lab.isDemo).toBe(false);
      expect(lab.demoLimits).toBeUndefined();
    });
  });

  describe('updateDemoLimits', () => {
    it('should update limits on a demo lab', () => {
      const lab = Lab.createDemo('Demo');
      lab.updateDemoLimits({ maxTanks: 10 });
      expect(lab.demoLimits!.maxTanks).toBe(10);
      expect(lab.demoLimits!.maxRacksPerTank).toBe(DEMO_LIMITS_DEFAULTS.maxRacksPerTank);
    });

    it('should throw when updating limits on a non-demo lab', () => {
      const lab = Lab.create('Normal');
      expect(() => lab.updateDemoLimits({ maxTanks: 10 })).toThrow('Demo limits can only be set on demo labs');
    });
  });

  describe('date immutability', () => {
    it('should return copies of dates to prevent mutation', () => {
      const lab = Lab.create('Test');
      const date1 = lab.createdAt;
      const date2 = lab.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('demoLimits immutability', () => {
    it('should return a copy of demoLimits to prevent mutation', () => {
      const lab = Lab.createDemo('Demo');
      const limits1 = lab.demoLimits!;
      limits1.maxTanks = 999;
      expect(lab.demoLimits!.maxTanks).toBe(DEMO_LIMITS_DEFAULTS.maxTanks);
    });
  });
});
