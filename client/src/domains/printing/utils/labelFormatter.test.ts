/**
 * Label Formatter Tests
 */

import { describe, it, expect } from 'vitest';

import {
  formatLabelDate,
  getResearcherInitials,
  buildLine,
  formatTubeForLabel,
  hasLabelContent,
  countLabelLines,
} from './labelFormatter';

import type { TubeData, Researcher } from '@odysseus/shared-schemas';

// ── HELPER FUNCTIONS ──

/** Create a minimal TubeData for testing */
function createTube(sample: Partial<TubeData['sample']> = {}): TubeData {
  return {
    id: 'test-tube-1',
    location: {
      tankId: '1',
      rackId: 'A',
      boxId: '1',
      position: 1,
    },
    sample: {
      cellType: undefined,
      donorInternalId: undefined,
      donorSourceId: undefined,
      concentration: undefined,
      concentrationUnit: undefined,
      date: undefined,
      cultureCondition: undefined,
      lotNumber: undefined,
      notes: undefined,
      ...sample,
    },
    researcherId: 'researcher-1',
    timestamps: {
      createdAt: '2026-01-29T12:00:00.000Z',
      updatedAt: '2026-01-29T12:00:00.000Z',
    },
    version: 1,
  };
}

/** Create a minimal Researcher for testing */
function createResearcher(firstName: string, lastName: string, email = 'test@lab.com'): Researcher {
  return {
    id: 'researcher-1',
    personId: 'person-1',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    approvalStatus: 'approved',
    source: 'admin',
    firstName,
    lastName,
    email,
  };
}

// ── formatLabelDate ──

describe('formatLabelDate', () => {
  it('formats ISO date string as MM/DD/YY', () => {
    expect(formatLabelDate('2026-01-29')).toBe('01/29/26');
  });

  it('formats ISO datetime string as MM/DD/YY', () => {
    expect(formatLabelDate('2026-01-29T12:00:00.000Z')).toBe('01/29/26');
  });

  it('formats Date object as MM/DD/YY', () => {
    // Use UTC date to avoid local timezone issues in tests
    const date = new Date(Date.UTC(2026, 0, 29)); // January 29, 2026 UTC
    expect(formatLabelDate(date)).toBe('01/29/26');
  });

  it('returns undefined for undefined input', () => {
    expect(formatLabelDate(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(formatLabelDate('')).toBeUndefined();
  });

  it('returns undefined for invalid date string', () => {
    expect(formatLabelDate('invalid-date')).toBeUndefined();
  });

  it('pads single-digit months and days', () => {
    expect(formatLabelDate('2026-03-05')).toBe('03/05/26');
  });

  it('handles end of year dates', () => {
    expect(formatLabelDate('2026-12-31')).toBe('12/31/26');
  });
});

// ── getResearcherInitials ──

describe('getResearcherInitials', () => {
  it('returns uppercase initials from first and last name', () => {
    const researcher = createResearcher('John', 'Doe');
    expect(getResearcherInitials(researcher)).toBe('JD');
  });

  it('handles lowercase names', () => {
    const researcher = createResearcher('jane', 'smith');
    expect(getResearcherInitials(researcher)).toBe('JS');
  });

  it('returns undefined for undefined researcher', () => {
    expect(getResearcherInitials(undefined)).toBeUndefined();
  });

  it('returns undefined if firstName is missing', () => {
    const researcher = { ...createResearcher('John', 'Doe'), firstName: '' };
    expect(getResearcherInitials(researcher)).toBeUndefined();
  });

  it('returns undefined if lastName is missing', () => {
    const researcher = { ...createResearcher('John', 'Doe'), lastName: '' };
    expect(getResearcherInitials(researcher)).toBeUndefined();
  });

  it('handles names with special characters', () => {
    const researcher = createResearcher("O'Brien", 'McDonald');
    expect(getResearcherInitials(researcher)).toBe('OM');
  });
});

// ── buildLine ──

describe('buildLine', () => {
  it('joins multiple parts with separator', () => {
    expect(buildLine(['a', 'b', 'c'], ', ')).toBe('a, b, c');
  });

  it('skips undefined parts', () => {
    expect(buildLine(['a', undefined, 'c'], ', ')).toBe('a, c');
  });

  it('skips empty string parts', () => {
    expect(buildLine(['a', '', 'c'], ', ')).toBe('a, c');
  });

  it('returns undefined if all parts are empty', () => {
    expect(buildLine([undefined, '', undefined], ', ')).toBeUndefined();
  });

  it('returns single value without separator', () => {
    expect(buildLine(['only'], ', ')).toBe('only');
  });

  it('handles different separators', () => {
    expect(buildLine(['a', 'b'], ' / ')).toBe('a / b');
    expect(buildLine(['a', 'b'], '  ')).toBe('a  b');
  });
});

// ── formatTubeForLabel ──

describe('formatTubeForLabel', () => {
  describe('line 1 - cell type', () => {
    it('includes cell type on line 1', () => {
      const tube = createTube({ cellType: 'iPSC-Neuron' });
      const result = formatTubeForLabel(tube);
      expect(result.line1).toBe('iPSC-Neuron');
    });

    it('trims whitespace from cell type', () => {
      const tube = createTube({ cellType: '  HEK293  ' });
      const result = formatTubeForLabel(tube);
      expect(result.line1).toBe('HEK293');
    });

    it('returns undefined for line 1 if no cell type', () => {
      const tube = createTube({ cellType: undefined });
      const result = formatTubeForLabel(tube);
      expect(result.line1).toBeUndefined();
    });

    it('returns undefined for line 1 if cell type is empty string', () => {
      const tube = createTube({ cellType: '' });
      const result = formatTubeForLabel(tube);
      expect(result.line1).toBeUndefined();
    });
  });

  describe('line 2 - donor IDs', () => {
    it('includes both IDs separated by slash', () => {
      const tube = createTube({
        donorInternalId: 'INT-4521',
        donorSourceId: 'SRC-882',
      });
      const result = formatTubeForLabel(tube);
      expect(result.line2).toBe('INT-4521 / SRC-882');
    });

    it('includes only internal ID if source ID is missing', () => {
      const tube = createTube({ donorInternalId: 'INT-4521' });
      const result = formatTubeForLabel(tube);
      expect(result.line2).toBe('INT-4521');
    });

    it('includes only source ID if internal ID is missing', () => {
      const tube = createTube({ donorSourceId: 'SRC-882' });
      const result = formatTubeForLabel(tube);
      expect(result.line2).toBe('SRC-882');
    });

    it('returns undefined for line 2 if both IDs missing', () => {
      const tube = createTube({});
      const result = formatTubeForLabel(tube);
      expect(result.line2).toBeUndefined();
    });
  });

  describe('line 3 - culture condition and lot number', () => {
    it('includes both culture condition and lot number', () => {
      const tube = createTube({
        cultureCondition: '2D-Diff',
        lotNumber: '23A',
      });
      const result = formatTubeForLabel(tube);
      expect(result.line3).toBe('2D-Diff, Lot 23A');
    });

    it('includes only culture condition if lot number missing', () => {
      const tube = createTube({ cultureCondition: '2D-Diff' });
      const result = formatTubeForLabel(tube);
      expect(result.line3).toBe('2D-Diff');
    });

    it('includes only lot number if culture condition missing', () => {
      const tube = createTube({ lotNumber: '23A' });
      const result = formatTubeForLabel(tube);
      expect(result.line3).toBe('Lot 23A');
    });

    it('returns undefined for line 3 if both missing', () => {
      const tube = createTube({});
      const result = formatTubeForLabel(tube);
      expect(result.line3).toBeUndefined();
    });
  });

  describe('line 4 - concentration, date, initials', () => {
    it('includes all three fields', () => {
      const tube = createTube({
        concentration: 5000000,
        concentrationUnit: 'c/mL',
        date: '2026-01-29',
      });
      const researcher = createResearcher('Evan', 'Miller');
      const result = formatTubeForLabel(tube, researcher);
      // formatConcentrationDisplay uses scientific notation with 2 decimal places
      expect(result.line4).toMatch(/^5\.\d+E\+6 c\/mL {2}01\/29\/26 {2}EM$/);
    });

    it('includes concentration and date without initials', () => {
      const tube = createTube({
        concentration: 5000000,
        concentrationUnit: 'c/mL',
        date: '2026-01-29',
      });
      const result = formatTubeForLabel(tube, undefined);
      expect(result.line4).toMatch(/^5\.\d+E\+6 c\/mL {2}01\/29\/26$/);
    });

    it('includes only concentration', () => {
      const tube = createTube({
        concentration: 1500000,
        concentrationUnit: 'c/v',
      });
      const result = formatTubeForLabel(tube);
      expect(result.line4).toMatch(/^1\.\d+E\+6 c\/v$/);
    });

    it('includes only date', () => {
      const tube = createTube({ date: '2026-01-29' });
      const result = formatTubeForLabel(tube);
      expect(result.line4).toBe('01/29/26');
    });

    it('includes only initials', () => {
      const tube = createTube({});
      const researcher = createResearcher('Jane', 'Doe');
      const result = formatTubeForLabel(tube, researcher);
      expect(result.line4).toBe('JD');
    });

    it('returns undefined for line 4 if all fields missing', () => {
      const tube = createTube({});
      const result = formatTubeForLabel(tube);
      expect(result.line4).toBeUndefined();
    });

    it('formats concentration without unit', () => {
      const tube = createTube({ concentration: 5000000 });
      const result = formatTubeForLabel(tube);
      expect(result.line4).toMatch(/^5\.\d+E\+6$/);
    });
  });

  describe('full label examples', () => {
    it('formats complete label with all fields', () => {
      const tube = createTube({
        cellType: 'iPSC-Neuron',
        donorInternalId: 'INT-4521',
        donorSourceId: 'SRC-882',
        cultureCondition: '2D-Diff',
        lotNumber: '23A',
        concentration: 5000000,
        concentrationUnit: 'c/mL',
        date: '2026-01-29',
      });
      const researcher = createResearcher('Evan', 'Miller');
      const result = formatTubeForLabel(tube, researcher);

      expect(result.line1).toBe('iPSC-Neuron');
      expect(result.line2).toBe('INT-4521 / SRC-882');
      expect(result.line3).toBe('2D-Diff, Lot 23A');
      expect(result.line4).toMatch(/^5\.\d+E\+6 c\/mL {2}01\/29\/26 {2}EM$/);
    });

    it('formats minimal label with only cell type and date', () => {
      const tube = createTube({
        cellType: 'iPSC-Neuron',
        date: '2026-01-29',
      });
      const researcher = createResearcher('Evan', 'Miller');
      const result = formatTubeForLabel(tube, researcher);

      expect(result.line1).toBe('iPSC-Neuron');
      expect(result.line2).toBeUndefined();
      expect(result.line3).toBeUndefined();
      expect(result.line4).toBe('01/29/26  EM');
    });

    it('formats empty tube with no lines', () => {
      const tube = createTube({});
      const result = formatTubeForLabel(tube);

      expect(result.line1).toBeUndefined();
      expect(result.line2).toBeUndefined();
      expect(result.line3).toBeUndefined();
      expect(result.line4).toBeUndefined();
    });
  });
});

// ── hasLabelContent ──

describe('hasLabelContent', () => {
  it('returns true if line1 has content', () => {
    expect(hasLabelContent({ line1: 'text' })).toBe(true);
  });

  it('returns true if line2 has content', () => {
    expect(hasLabelContent({ line2: 'text' })).toBe(true);
  });

  it('returns true if line3 has content', () => {
    expect(hasLabelContent({ line3: 'text' })).toBe(true);
  });

  it('returns true if line4 has content', () => {
    expect(hasLabelContent({ line4: 'text' })).toBe(true);
  });

  it('returns false if all lines are undefined', () => {
    expect(hasLabelContent({})).toBe(false);
  });

  it('returns false if all lines are empty strings', () => {
    expect(hasLabelContent({ line1: '', line2: '', line3: '', line4: '' })).toBe(false);
  });
});

// ── countLabelLines ──

describe('countLabelLines', () => {
  it('returns 4 for all lines present', () => {
    expect(
      countLabelLines({
        line1: 'a',
        line2: 'b',
        line3: 'c',
        line4: 'd',
      })
    ).toBe(4);
  });

  it('returns 0 for no lines present', () => {
    expect(countLabelLines({})).toBe(0);
  });

  it('returns 2 for two lines present', () => {
    expect(countLabelLines({ line1: 'a', line4: 'd' })).toBe(2);
  });

  it('does not count empty strings', () => {
    expect(countLabelLines({ line1: 'a', line2: '' })).toBe(1);
  });
});
