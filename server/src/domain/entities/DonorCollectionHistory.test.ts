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

    it('should accept string collection date', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      expect(entry.collectionDate).toBeInstanceOf(Date);
    });

    it('should accept Date object for collection date', () => {
      const date = new Date('2025-05-05');
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: date,
      });
      expect(entry.collectionDate.getTime()).toBe(date.getTime());
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
      const date = new Date('2025-05-05');
      const now = new Date();
      const entry = DonorCollectionHistory.fromData({
        id: 'donorCollection_test',
        donorId: 'donor_123',
        collectionDate: date,
        createdAt: now,
      });
      expect(entry.collectionDate.getTime()).toBe(date.getTime());
      expect(entry.createdAt.getTime()).toBe(now.getTime());
    });
  });

  describe('date immutability', () => {
    it('should return copies of collectionDate', () => {
      const entry = DonorCollectionHistory.create({
        donorId: 'donor_123',
        collectionDate: '2025-05-05',
      });
      const date1 = entry.collectionDate;
      const date2 = entry.collectionDate;
      expect(date1).not.toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

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
