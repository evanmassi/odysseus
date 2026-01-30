/**
 * Cryo Tube Label Template Tests
 */

import { describe, it, expect } from 'vitest';

import { BUILT_IN_LABEL_SIZES } from '../../types';

import { generateLabelXml } from './cryoTubeLabel';

import type { LabelSize, LabelLines } from '../../types';

const defaultSize: LabelSize = BUILT_IN_LABEL_SIZES.find(s => s.id === 'dtcr-2000')!;

describe('generateLabelXml', () => {
  describe('basic XML structure', () => {
    it('should generate valid XML with all four lines', () => {
      const lines: LabelLines = {
        line1: 'iPSC-Neuron',
        line2: 'INT-4521 / SRC-882',
        line3: '2D-Diff, Lot 23A',
        line4: '5.0E+6 c/mL  01/29/26  EJM',
      };

      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<DieCutLabel Version="8.0" Units="twips">');
      expect(xml).toContain('<PaperOrientation>Landscape</PaperOrientation>');
      expect(xml).toContain('<TextFitMode>AlwaysFit</TextFitMode>');
      expect(xml).toContain('iPSC-Neuron');
      expect(xml).toContain('INT-4521 / SRC-882');
      expect(xml).toContain('2D-Diff, Lot 23A');
      expect(xml).toContain('5.0E+6 c/mL  01/29/26  EJM');
    });

    it('should include four TextObject elements for four lines', () => {
      const lines: LabelLines = {
        line1: 'Line 1',
        line2: 'Line 2',
        line3: 'Line 3',
        line4: 'Line 4',
      };

      const xml = generateLabelXml(lines, defaultSize);
      const textObjectCount = (xml.match(/<TextObject>/g) ?? []).length;

      expect(textObjectCount).toBe(4);
    });
  });

  describe('dynamic line omission', () => {
    it('should omit line1 when undefined', () => {
      const lines: LabelLines = {
        line1: undefined,
        line2: 'Line 2',
        line3: 'Line 3',
        line4: 'Line 4',
      };

      const xml = generateLabelXml(lines, defaultSize);
      const textObjectCount = (xml.match(/<TextObject>/g) ?? []).length;

      expect(textObjectCount).toBe(3);
      expect(xml).not.toContain('<Name>Line1</Name>');
      expect(xml).toContain('<Name>Line2</Name>');
    });

    it('should generate only two objects for two lines', () => {
      const lines: LabelLines = {
        line1: 'Cell Type',
        line4: '01/29/26  EJM',
      };

      const xml = generateLabelXml(lines, defaultSize);
      const textObjectCount = (xml.match(/<TextObject>/g) ?? []).length;

      expect(textObjectCount).toBe(2);
      expect(xml).toContain('Cell Type');
      expect(xml).toContain('01/29/26  EJM');
    });

    it('should generate single object for one line', () => {
      const lines: LabelLines = {
        line1: 'Only Cell Type',
      };

      const xml = generateLabelXml(lines, defaultSize);
      const textObjectCount = (xml.match(/<TextObject>/g) ?? []).length;

      expect(textObjectCount).toBe(1);
    });

    it('should generate empty label when no lines provided', () => {
      const lines: LabelLines = {};

      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('<DieCutLabel');
      expect(xml).not.toContain('<TextObject>');
    });
  });

  describe('label sizes', () => {
    it('should calculate dimensions in twips for dtcr-2000', () => {
      const lines: LabelLines = { line1: 'Test' };
      const size = BUILT_IN_LABEL_SIZES.find(s => s.id === 'dtcr-2000')!;

      const xml = generateLabelXml(lines, size);

      // 1.5" width = 2160 twips, 0.5" height = 720 twips
      expect(xml).toContain('Width="720"');
      expect(xml).toContain('Height="2160"');
    });

    it('should calculate dimensions for dtcr-1000 (small)', () => {
      const lines: LabelLines = { line1: 'Test' };
      const size = BUILT_IN_LABEL_SIZES.find(s => s.id === 'dtcr-1000')!;

      const xml = generateLabelXml(lines, size);

      // 1.05" width = 1512 twips, 0.5" height = 720 twips
      expect(xml).toContain('Width="720"');
      expect(xml).toContain('Height="1512"');
    });

    it('should calculate dimensions for dtcr-3000 (large)', () => {
      const lines: LabelLines = { line1: 'Test' };
      const size = BUILT_IN_LABEL_SIZES.find(s => s.id === 'dtcr-3000')!;

      const xml = generateLabelXml(lines, size);

      // 1.5" width = 2160 twips, 0.75" height = 1080 twips
      expect(xml).toContain('Width="1080"');
      expect(xml).toContain('Height="2160"');
    });

    it('should handle custom sizes', () => {
      const lines: LabelLines = { line1: 'Test' };
      const customSize: LabelSize = {
        id: 'custom-1',
        width: 2.0,
        height: 0.5,
        name: '2.00" × 0.50"',
        isCustom: true,
      };

      const xml = generateLabelXml(lines, customSize);

      // 2.0" width = 2880 twips, 0.5" height = 720 twips
      expect(xml).toContain('Width="720"');
      expect(xml).toContain('Height="2880"');
    });
  });

  describe('XML escaping', () => {
    it('should escape ampersand', () => {
      const lines: LabelLines = { line1: 'R&D Sample' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('R&amp;D Sample');
      expect(xml).not.toContain('R&D Sample');
    });

    it('should escape angle brackets', () => {
      const lines: LabelLines = { line1: 'Size <5mL>' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('Size &lt;5mL&gt;');
    });

    it('should escape quotes', () => {
      const lines: LabelLines = { line1: 'Sample "A"' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('Sample &quot;A&quot;');
    });

    it('should escape apostrophes', () => {
      const lines: LabelLines = { line1: "John's Sample" };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('John&apos;s Sample');
    });
  });

  describe('font configuration', () => {
    it('should use Arial font family', () => {
      const lines: LabelLines = { line1: 'Test' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('Family="Arial"');
    });

    it('should set text as non-bold', () => {
      const lines: LabelLines = { line1: 'Test' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('Bold="False"');
    });

    it('should use AlwaysFit text mode', () => {
      const lines: LabelLines = { line1: 'Test' };
      const xml = generateLabelXml(lines, defaultSize);

      expect(xml).toContain('<TextFitMode>AlwaysFit</TextFitMode>');
    });
  });
});
