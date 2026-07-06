/**
 * Person Entity Tests
 */

import { Person } from './Person';

describe('Person', () => {
  describe('create', () => {
    it('should create with generated id and trimmed fields', () => {
      const person = Person.create('  John  ', '  Doe  ', '  John@Example.COM  ');
      expect(person.id).toMatch(/^person_/);
      expect(person.firstName).toBe('John');
      expect(person.lastName).toBe('Doe');
      expect(person.email).toBe('john@example.com');
      expect(person.position).toBeUndefined();
      expect(person.department).toBeUndefined();
    });

    it('should accept optional position and department', () => {
      const person = Person.create('Jane', 'Doe', 'jane@test.com', '  PI  ', '  Biology  ');
      expect(person.position).toBe('PI');
      expect(person.department).toBe('Biology');
    });

    it('should set createdAt and updatedAt to the same time', () => {
      const person = Person.create('Jane', 'Doe', 'jane@test.com');
      expect(person.createdAt.getTime()).toBe(person.updatedAt.getTime());
    });

    it('should throw for empty first name', () => {
      expect(() => Person.create('', 'Doe', 'a@b.com')).toThrow('First name is required');
    });

    it('should throw for whitespace-only first name', () => {
      expect(() => Person.create('   ', 'Doe', 'a@b.com')).toThrow('First name is required');
    });

    it('should throw for empty last name', () => {
      expect(() => Person.create('John', '', 'a@b.com')).toThrow('Last name is required');
    });

    it('should throw for whitespace-only last name', () => {
      expect(() => Person.create('John', '   ', 'a@b.com')).toThrow('Last name is required');
    });

    it('should throw for first name exceeding 100 characters', () => {
      expect(() => Person.create('x'.repeat(101), 'Doe', 'a@b.com')).toThrow('First name cannot exceed 100 characters');
    });

    it('should throw for last name exceeding 100 characters', () => {
      expect(() => Person.create('John', 'x'.repeat(101), 'a@b.com')).toThrow('Last name cannot exceed 100 characters');
    });

    it('should allow empty email (historical persons kept for tube attribution have none)', () => {
      expect(() => Person.create('John', 'Doe', '')).not.toThrow();
    });

    it('should throw for invalid email format', () => {
      expect(() => Person.create('John', 'Doe', 'not-an-email')).toThrow('Invalid email format');
    });

    it('should throw for email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@b.com';
      expect(() => Person.create('John', 'Doe', longEmail)).toThrow('Email cannot exceed 255 characters');
    });
  });

  describe('updateProfile', () => {
    it('should update name and optional fields', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      person.updateProfile('Jane', 'Smith', 'Director', 'Chemistry');
      expect(person.firstName).toBe('Jane');
      expect(person.lastName).toBe('Smith');
      expect(person.position).toBe('Director');
      expect(person.department).toBe('Chemistry');
    });

    it('should trim whitespace', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      person.updateProfile('  Jane  ', '  Smith  ', '  PI  ', '  Bio  ');
      expect(person.firstName).toBe('Jane');
      expect(person.lastName).toBe('Smith');
      expect(person.position).toBe('PI');
      expect(person.department).toBe('Bio');
    });

    it('should clear optional fields when undefined', () => {
      const person = Person.create('John', 'Doe', 'john@test.com', 'PI', 'Bio');
      person.updateProfile('John', 'Doe');
      expect(person.position).toBeUndefined();
      expect(person.department).toBeUndefined();
    });

    it('should update updatedAt', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      const before = person.updatedAt;
      person.updateProfile('Jane', 'Smith');
      expect(person.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should re-validate after update', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      expect(() => person.updateProfile('', 'Smith')).toThrow('First name is required');
    });
  });

  describe('updateEmail', () => {
    it('should lowercase and trim email', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      person.updateEmail('  NEW@Example.COM  ');
      expect(person.email).toBe('new@example.com');
    });

    it('should update updatedAt', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      const before = person.updatedAt;
      person.updateEmail('new@test.com');
      expect(person.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should re-validate after update', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      expect(() => person.updateEmail('not-valid')).toThrow('Invalid email format');
    });
  });

  describe('fromData / toData roundtrip', () => {
    it('should preserve all fields through roundtrip', () => {
      const original = Person.create('John', 'Doe', 'john@test.com', 'PI', 'Biology');
      const data = original.toData();
      const restored = Person.fromData(data);

      expect(restored.id).toBe(original.id);
      expect(restored.firstName).toBe('John');
      expect(restored.lastName).toBe('Doe');
      expect(restored.email).toBe('john@test.com');
      expect(restored.position).toBe('PI');
      expect(restored.department).toBe('Biology');
    });

    it('should handle string dates from persistence', () => {
      const restored = Person.fromData({
        id: 'person_test',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-06-15T12:00:00.000Z',
      });
      expect(restored.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(restored.updatedAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should handle undefined optional fields', () => {
      const original = Person.create('John', 'Doe', 'john@test.com');
      const data = original.toData();
      const restored = Person.fromData(data);
      expect(restored.position).toBeUndefined();
      expect(restored.department).toBeUndefined();
    });
  });

  describe('fullName', () => {
    it('should combine first and last name', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      expect(person.fullName).toBe('John Doe');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      const data = person.toData();
      const same = Person.fromData(data);
      expect(person.equals(same)).toBe(true);
    });

    it('should return false for different id', () => {
      const a = Person.create('John', 'Doe', 'john@test.com');
      const b = Person.create('John', 'Doe', 'john@test.com');
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for null', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      expect(person.equals(null as any)).toBe(false);
    });
  });

  describe('date immutability', () => {
    it('should return copies of createdAt to prevent mutation', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      const date1 = person.createdAt;
      const date2 = person.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it('should return copies of updatedAt to prevent mutation', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      const date1 = person.updatedAt;
      const date2 = person.updatedAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('toString', () => {
    it('should include name and email', () => {
      const person = Person.create('John', 'Doe', 'john@test.com');
      expect(person.toString()).toBe('Person(John Doe) - john@test.com');
    });
  });
});
