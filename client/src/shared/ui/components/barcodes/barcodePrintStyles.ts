/**
 * Barcode Print Styles
 *
 * Shared CSS-string builder used by the single-label print modal and the
 * bulk sheet print modal. Centralizes the @page rule and @media print
 * isolation so both modes stay in sync.
 */

type PrintPageSize =
  | { kind: 'label'; width: number; height: number }
  | { kind: 'sheet'; paperSize: 'letter' | 'a4' };

export interface PrintStyleOptions {
  pageSize: PrintPageSize;
  includeSheetBreaks: boolean;
}

export const PRINT_PORTAL_CLASS = 'barcode-print-portal';
export const PRINT_SHEET_CLASS = 'barcode-print-sheet';

export function buildBarcodePrintStyles(opts: PrintStyleOptions): string {
  const pageRule =
    opts.pageSize.kind === 'label'
      ? `@page { size: ${opts.pageSize.width}in ${opts.pageSize.height}in; margin: 0; }`
      : `@page { size: ${opts.pageSize.paperSize}; margin: 0; }`;

  const sheetBreakRule = opts.includeSheetBreaks
    ? `.${PRINT_SHEET_CLASS} { break-after: page; }
       .${PRINT_SHEET_CLASS}:last-child { break-after: auto; }`
    : '';

  return `
    .${PRINT_PORTAL_CLASS} {
      position: fixed;
      left: -99999px;
      top: -99999px;
      pointer-events: none;
    }
    ${pageRule}
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; }
      body > *:not(.${PRINT_PORTAL_CLASS}) { display: none !important; }
      .${PRINT_PORTAL_CLASS} {
        position: static !important;
        left: auto !important;
        top: auto !important;
        pointer-events: auto !important;
      }
      ${sheetBreakRule}
    }
  `;
}
