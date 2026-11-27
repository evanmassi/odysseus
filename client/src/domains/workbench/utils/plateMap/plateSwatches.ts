import { indicatorColorOf, colorLineOf, type Protocol } from '@odysseus/shared-schemas';

import { findNamed } from '../materials/materialLookup';

import { lineLayers, indicatorKindOf, type IndicatorKind } from './plateLayers';

import type { SolvedBoard } from '../formulas/boardCalculation';

export interface PlateSwatch {
  color: string;
  kind: IndicatorKind;
}

export type PlateSwatchOf = (name: string) => PlateSwatch | undefined;

export function plateSwatches(
  protocol: Pick<Protocol, 'plateMaps' | 'series'>,
  board: SolvedBoard
): PlateSwatchOf {
  const swatches = protocol.plateMaps
    .flatMap(plateMap =>
      lineLayers(plateMap, protocol.series, colorLineOf(plateMap), board).flatMap(
        ({ line, role }) => {
          const kind = indicatorKindOf(role);
          if (!kind) return [];
          return line.values.flatMap(value => {
            const color = kind === 'fill' ? value.color : indicatorColorOf(plateMap, value);
            return color ? [{ name: value.text, swatch: { color, kind } }] : [];
          });
        }
      )
    )
    .sort((a, b) => Number(b.swatch.kind === 'fill') - Number(a.swatch.kind === 'fill'));
  return name => findNamed(swatches, name, swatch => swatch.name)?.swatch;
}
