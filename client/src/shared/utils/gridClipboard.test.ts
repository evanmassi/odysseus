/**
 * Grid Clipboard Tests
 *
 * Tests clipboard serialization, parsing, and OS clipboard integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  serializeClipboard,
  tryParseClipboard,
  writeClipboardOS,
  readClipboardOS,
} from './gridClipboard';

import type { ClipboardData } from '@shared/types/Clipboard';

describe('gridClipboard', () => {
  const createMockClipboardData = (overrides?: Partial<ClipboardData>): ClipboardData => ({
    tubes: [
      {
        id: 'tube-1',
        location: { tankId: 'tank-1', rackId: '1', boxId: 'A', position: 1 },
        sample: { cellType: 'Sample A' },
        researcherId: 'researcher-1',
        timestamps: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        version: 1,
      },
    ],
    operation: 'copy',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    selectionMode: 'standard',
    sourceLocation: {
      tankId: 'tank-1',
      rackId: '1',
      boxId: 'A',
    },
    ...overrides,
  });

  describe('serializeClipboard()', () => {
    it('should serialize clipboard data with marker', () => {
      const clipboard = createMockClipboardData();

      const result = serializeClipboard(clipboard);
      const parsed = JSON.parse(result);

      expect(parsed.__type).toBe('OdysseusGrid/Tubes@v1');
      expect(parsed.data).toBeDefined();
    });

    it('should include all clipboard fields', () => {
      const clipboard = createMockClipboardData();

      const result = serializeClipboard(clipboard);
      const parsed = JSON.parse(result);

      expect(parsed.data.tubes).toHaveLength(1);
      expect(parsed.data.operation).toBe('copy');
      expect(parsed.data.selectionMode).toBe('standard');
    });

    it('should serialize cut operation', () => {
      const clipboard = createMockClipboardData({ operation: 'cut' });

      const result = serializeClipboard(clipboard);
      const parsed = JSON.parse(result);

      expect(parsed.data.operation).toBe('cut');
    });

    it('should serialize drag selection mode', () => {
      const clipboard = createMockClipboardData({ selectionMode: 'drag' });

      const result = serializeClipboard(clipboard);
      const parsed = JSON.parse(result);

      expect(parsed.data.selectionMode).toBe('drag');
    });

    it('should preserve source location', () => {
      const clipboard = createMockClipboardData();

      const result = serializeClipboard(clipboard);
      const parsed = JSON.parse(result);

      expect(parsed.data.sourceLocation.tankId).toBe('tank-1');
      expect(parsed.data.sourceLocation.rackId).toBe('1');
      expect(parsed.data.sourceLocation.boxId).toBe('A');
    });
  });

  describe('tryParseClipboard()', () => {
    it('should parse valid clipboard text', () => {
      const clipboard = createMockClipboardData();
      const text = serializeClipboard(clipboard);

      const result = tryParseClipboard(text);

      expect(result).not.toBeNull();
      expect(result?.tubes).toHaveLength(1);
      expect(result?.operation).toBe('copy');
    });

    it('should return null for invalid JSON', () => {
      const result = tryParseClipboard('not valid json');

      expect(result).toBeNull();
    });

    it('should return null for JSON without marker', () => {
      const result = tryParseClipboard(JSON.stringify({ foo: 'bar' }));

      expect(result).toBeNull();
    });

    it('should return null for wrong marker', () => {
      const result = tryParseClipboard(JSON.stringify({ __type: 'WrongMarker', data: {} }));

      expect(result).toBeNull();
    });

    it('should return null for missing data', () => {
      const result = tryParseClipboard(JSON.stringify({ __type: 'OdysseusGrid/Tubes@v1' }));

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = tryParseClipboard('');

      expect(result).toBeNull();
    });

    it('should parse clipboard with multiple tubes', () => {
      const clipboard = createMockClipboardData({
        tubes: [
          {
            id: 'tube-1',
            location: { tankId: 't', rackId: '1', boxId: 'A', position: 1 },
            sample: { cellType: 'A' },
            researcherId: 'r',
            timestamps: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            version: 1,
          },
          {
            id: 'tube-2',
            location: { tankId: 't', rackId: '1', boxId: 'A', position: 2 },
            sample: { cellType: 'B' },
            researcherId: 'r',
            timestamps: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            version: 1,
          },
        ],
      });
      const text = serializeClipboard(clipboard);

      const result = tryParseClipboard(text);

      expect(result?.tubes).toHaveLength(2);
    });
  });

  describe('writeClipboardOS()', () => {
    let originalNavigator: typeof navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    it('should write to OS clipboard when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { writeText: mockWriteText } },
        writable: true,
      });

      const clipboard = createMockClipboardData();

      await writeClipboardOS(clipboard);

      expect(mockWriteText).toHaveBeenCalled();
      const writtenText = mockWriteText.mock.calls[0][0];
      expect(writtenText).toContain('OdysseusGrid/Tubes@v1');
    });

    it('should not throw when clipboard API unavailable', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
      });

      const clipboard = createMockClipboardData();

      await expect(writeClipboardOS(clipboard)).resolves.not.toThrow();
    });

    it('should not throw when writeText fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { writeText: mockWriteText } },
        writable: true,
      });

      const clipboard = createMockClipboardData();

      await expect(writeClipboardOS(clipboard)).resolves.not.toThrow();
    });
  });

  describe('readClipboardOS()', () => {
    let originalNavigator: typeof navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    it('should read and parse from OS clipboard', async () => {
      const clipboard = createMockClipboardData();
      const text = serializeClipboard(clipboard);
      const mockReadText = vi.fn().mockResolvedValue(text);
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { readText: mockReadText } },
        writable: true,
      });

      const result = await readClipboardOS();

      expect(mockReadText).toHaveBeenCalled();
      expect(result?.tubes).toHaveLength(1);
    });

    it('should return null when clipboard API unavailable', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
      });

      const result = await readClipboardOS();

      expect(result).toBeNull();
    });

    it('should return null when readText fails', async () => {
      const mockReadText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { readText: mockReadText } },
        writable: true,
      });

      const result = await readClipboardOS();

      expect(result).toBeNull();
    });

    it('should return null when clipboard contains non-Odysseus data', async () => {
      const mockReadText = vi.fn().mockResolvedValue('plain text from another app');
      Object.defineProperty(global, 'navigator', {
        value: { clipboard: { readText: mockReadText } },
        writable: true,
      });

      const result = await readClipboardOS();

      expect(result).toBeNull();
    });
  });
});
