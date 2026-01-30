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

  describe('edge cases', () => {
    describe('complex XML escaping', () => {
      it('should escape multiple special characters in one string', () => {
        const lines: LabelLines = { line1: 'R&D <Test> "Sample" \'Cell\' & More' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain(
          'R&amp;D &lt;Test&gt; &quot;Sample&quot; &apos;Cell&apos; &amp; More'
        );
        expect(xml).not.toContain('R&D <Test>');
      });

      it('should escape special characters in all four lines', () => {
        const lines: LabelLines = {
          line1: 'Cell & Type',
          line2: 'ID <001>',
          line3: 'Lot "A"',
          line4: "John's Sample",
        };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('Cell &amp; Type');
        expect(xml).toContain('ID &lt;001&gt;');
        expect(xml).toContain('Lot &quot;A&quot;');
        expect(xml).toContain('John&apos;s Sample');
      });

      it('should handle consecutive special characters', () => {
        const lines: LabelLines = { line1: '<<&&>>' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('&lt;&lt;&amp;&amp;&gt;&gt;');
      });

      it('should handle already-escaped-looking text', () => {
        const lines: LabelLines = { line1: '&amp; should become &amp;amp;' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('&amp;amp; should become &amp;amp;amp;');
      });
    });

    describe('very long content', () => {
      it('should handle all four lines with 100+ characters each', () => {
        const longText = 'X'.repeat(150);
        const lines: LabelLines = {
          line1: longText,
          line2: longText,
          line3: longText,
          line4: longText,
        };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain(longText);
        expect((xml.match(/<TextObject>/g) ?? []).length).toBe(4);
      });

      it('should handle single line with 500+ characters', () => {
        const veryLongText = 'A'.repeat(500);
        const lines: LabelLines = { line1: veryLongText };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain(veryLongText);
      });
    });

    describe('unicode content', () => {
      it('should handle unicode characters', () => {
        const lines: LabelLines = { line1: 'Célula α-β γ δ ε' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('Célula α-β γ δ ε');
      });

      it('should handle Japanese characters', () => {
        const lines: LabelLines = { line1: '細胞タイプ 研究者' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('細胞タイプ 研究者');
      });

      it('should handle emoji', () => {
        const lines: LabelLines = { line1: 'Sample 🧪 Test 🔬' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('Sample 🧪 Test 🔬');
      });

      it('should handle mixed unicode and special characters', () => {
        const lines: LabelLines = { line1: 'α & β <γ> "δ"' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('α &amp; β &lt;γ&gt; &quot;δ&quot;');
      });
    });

    describe('whitespace handling', () => {
      it('should preserve multiple spaces', () => {
        const lines: LabelLines = { line1: 'Cell    Type    Here' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('Cell    Type    Here');
      });

      it('should handle tabs', () => {
        const lines: LabelLines = { line1: 'Cell\tType' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('Cell\tType');
      });

      it('should handle leading and trailing spaces', () => {
        const lines: LabelLines = { line1: '  Spaced  ' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('  Spaced  ');
      });
    });

    describe('extreme label sizes', () => {
      it('should handle minimum practical size', () => {
        const lines: LabelLines = { line1: 'Test' };
        const tinySize: LabelSize = {
          id: 'tiny',
          width: 0.5,
          height: 0.25,
          name: '0.50" × 0.25"',
        };
        const xml = generateLabelXml(lines, tinySize);

        // 0.5" = 720 twips, 0.25" = 360 twips
        expect(xml).toContain('Width="360"');
        expect(xml).toContain('Height="720"');
      });

      it('should handle large size', () => {
        const lines: LabelLines = { line1: 'Test' };
        const largeSize: LabelSize = {
          id: 'large',
          width: 4.0,
          height: 2.0,
          name: '4.00" × 2.00"',
        };
        const xml = generateLabelXml(lines, largeSize);

        // 4.0" = 5760 twips, 2.0" = 2880 twips
        expect(xml).toContain('Width="2880"');
        expect(xml).toContain('Height="5760"');
      });

      it('should handle fractional dimensions', () => {
        const lines: LabelLines = { line1: 'Test' };
        const fractionalSize: LabelSize = {
          id: 'fractional',
          width: 1.333,
          height: 0.666,
          name: '1.333" × 0.666"',
        };
        const xml = generateLabelXml(lines, fractionalSize);

        // Should round to integers
        expect(xml).toMatch(/Width="\d+"/);
        expect(xml).toMatch(/Height="\d+"/);
      });
    });

    describe('empty and minimal content', () => {
      it('should handle empty string lines (not undefined)', () => {
        const lines: LabelLines = {
          line1: '',
          line2: '',
          line3: '',
          line4: '',
        };
        const xml = generateLabelXml(lines, defaultSize);

        // Empty strings should be treated as no content
        expect(xml).not.toContain('<TextObject>');
      });

      it('should handle single character content', () => {
        const lines: LabelLines = { line1: 'X' };
        const xml = generateLabelXml(lines, defaultSize);

        expect(xml).toContain('>X</String>');
      });

      it('should handle whitespace-only content', () => {
        const lines: LabelLines = { line1: '   ' };
        const xml = generateLabelXml(lines, defaultSize);

        // Implementation dependent - may or may not include
        expect(xml).toContain('<DieCutLabel');
      });
    });
  });
});
