/**
 * Donor Collection History Entity Tests
 */

import { DonorCollectionHistory } from './DonorCollectionHistory';

describe('DonorCollectionHistory', () => {
  describe('create', () => {
    it('should create with generated id', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      expect(entry.id).toMatch(/^donorCollection_/);
      expect(entry.donorId).toBe('donor_123');
    });

    it('should keep a string collection date as a date-only string', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      expect(entry.collectionDate).toBe('2025-05-05');
    });

    it('should normalize a Date object to a date-only string', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: new Date('2025-05-05'),
      });
      expect(entry.collectionDate).toBe('2025-05-05');
    });

    it('should accept optional specimen type and source', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
        specimenType: 'Blood',
        source: 'Stanford Blood Center',
      });
      expect(entry.specimenType).toBe('Blood');
      expect(entry.source).toBe('Stanford Blood Center');
    });

    it('should leave specimen type and source undefined when not provided', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      expect(entry.specimenType).toBeUndefined();
      expect(entry.source).toBeUndefined();
    });

    it('should allow optional collection date', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        specimenType: 'Blood',
      });
      expect(entry.collectionDate).toBeUndefined();
      expect(entry.specimenType).toBe('Blood');
    });

    it('should allow only source without date or specimen type', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        source: 'UCSF',
      });
      expect(entry.collectionDate).toBeUndefined();
      expect(entry.specimenType).toBeUndefined();
      expect(entry.source).toBe('UCSF');
    });
  });

  describe('fromData', () => {
    it('should reconstruct from persisted data', () => {
      const entry = DonorCollectionHistory.fromData({
        id: 'donorCollection_test',
        donorId: 'donor_123',
        collectionDate: '2025-05-05T00:00:00.000Z',
        specimenType: 'Leukopak',
        source: 'UCSF',
        createdAt: '2025-05-06T12:00:00.000Z',
      });
      expect(entry.id).toBe('donorCollection_test');
      expect(entry.donorId).toBe('donor_123');
      expect(entry.specimenType).toBe('Leukopak');
      expect(entry.source).toBe('UCSF');
      expect(entry.createdAt.toISOString()).toBe('2025-05-06T12:00:00.000Z');
    });

    it('should handle Date objects for timestamps', () => {
      const now = new Date();
      const entry = DonorCollectionHistory.fromData({
        id: 'donorCollection_test',
        donorId: 'donor_123',
        collectionDate: new Date('2025-05-05'),
        createdAt: now,
      });
      expect(entry.collectionDate).toBe('2025-05-05');
      expect(entry.createdAt.getTime()).toBe(now.getTime());
    });
  });

  describe('date immutability', () => {
    it('should return copies of createdAt', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      const date1 = entry.createdAt;
      const date2 = entry.createdAt;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });
});
