import type { ReactNode } from 'react';

import { indicatorSwatchClass, indicatorSwatchStyle } from './indicatorSwatch';

import type { WellTooltip } from '../../../../utils/plateMap/wellTooltip';

export function wellTooltipTable({ heading, rows }: WellTooltip): ReactNode {
  return (
    <div className="flex flex-col gap-0.5">
      <b className="text-foreground">{heading}</b>
      {rows.length > 0 && (
        <table className="border-collapse">
          <tbody>
            {rows.map((row, index) =>
              row.kind === 'ratio' ? (
                <tr key={`${index}:${row.ratio}`}>
                  <td colSpan={3} className="whitespace-nowrap pb-0.5">
                    <b className="text-foreground dark:text-white">{row.ratio}</b>{' '}
                    <span className="text-muted-foreground">{row.between}</span>
                  </td>
                </tr>
              ) : row.kind === 'note' ? (
                <tr key={`${index}:${row.text}`}>
                  <td colSpan={3} className="whitespace-nowrap pb-0.5 text-muted-foreground">
                    {row.text}
                  </td>
                </tr>
              ) : row.kind === 'detail' ? (
                <tr key={`${index}:${row.text}`}>
                  <td colSpan={3} className="whitespace-nowrap pl-4 opacity-60">
                    {row.text}
                  </td>
                </tr>
              ) : (
                <tr key={`${index}:${row.name}`} className="text-foreground">
                  <td className="whitespace-nowrap pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      {row.indicator ? (
                        <i
                          aria-hidden
                          className={indicatorSwatchClass(row.indicator.kind)}
                          style={indicatorSwatchStyle(row.indicator.kind, row.indicator.color)}
                        />
                      ) : (
                        <i aria-hidden className="inline-block h-3.5 w-3.5 flex-none" />
                      )}
                      {row.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap pr-1.5 text-right font-mono font-semibold dark:text-white">
                    {row.amount}
                  </td>
                  <td className="whitespace-nowrap text-muted-foreground">{row.unit}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
