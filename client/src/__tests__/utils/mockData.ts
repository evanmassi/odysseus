import type { TubeData } from '../../shared/types/Tube';

/**
 * Create a mock tube with realistic test data
 */
export const createMockTube = (overrides: Partial<TubeData> = {}): TubeData => ({
  id: 'tube-1',
  location: {
    tankId: 'tank-1',
    rackId: 'rack-1',
    boxId: 'A',
    position: 1,
  },
  sample: {
    cellType: 'T-cells',
    donorInternalId: 'DONOR-001',
    donorSourceId: 'EXT-001',
    concentration: 1000000,
    concentrationUnit: 'c/mL',
    date: '2025-01-01',
    media: {
      type: 'RPMI-1640',
      supplements: '',
      selection: '',
    },
    cultureCondition: 'Standard',
    lotNumber: 'LOT-001',
    notes: 'Test sample for unit tests',
  },
  researcherId: 'researcher-1',
  timestamps: {
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  },
  version: 1,
  ...overrides,
});

/**
 * Create multiple mock tubes for testing lists
 */
export const createMockTubes = (count: number = 3): TubeData[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockTube({
      id: `tube-${index + 1}`,
      location: {
        tankId: 'tank-1',
        rackId: 'rack-1',
        boxId: 'A',
        position: index + 1,
      },
      sample: {
        cellType: index % 2 === 0 ? 'T-cells' : 'B-cells',
        donorInternalId: `DONOR-${String(index + 1).padStart(3, '0')}`,
        concentration: 1000000 + index * 100000,
      },
    })
  );
};

/**
 * Create mock researcher data
 */
export const createMockResearcher = (name: string = 'Dr. Test') => ({
  name,
  isActive: true,
  createdAt: new Date('2025-01-01T10:00:00Z'),
});

/**
 * Create mock researchers list
 */
export const createMockResearchers = (count: number = 3) => {
  return Array.from({ length: count }, (_, index) => createMockResearcher(`Dr. Test ${index + 1}`));
};
