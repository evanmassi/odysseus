import {
  indicatorColorOf,
  colorLineOf,
  type Protocol,
  type PlateMapCard,
} from '@odysseus/shared-schemas';

import { findNamed } from '../materials/materialLookup';

import { lineLayers, indicatorKindOf, type IndicatorKind } from './plateLayers';

import type { SolvedBoard } from '../formulas/boardCalculation';

export interface PlateSwatch {
  color: string;
  kind: IndicatorKind;
}

export type PlateSwatchOf = (name: string) => PlateSwatch | undefined;

export function plateSwatches(
  protocol: Pick<Protocol, 'cards'>,
  board: SolvedBoard
): PlateSwatchOf {
  const swatches = protocol.cards
    .filter((card): card is PlateMapCard => card.type === 'plateMap')
    .flatMap(plateMap =>
      lineLayers(plateMap, colorLineOf(plateMap), board).flatMap(({ line, role }) => {
        const kind = indicatorKindOf(role);
        if (!kind) return [];
        return line.values.flatMap(value => {
          const color = kind === 'fill' ? value.color : indicatorColorOf(plateMap, value);
          return color ? [{ name: value.text, swatch: { color, kind } }] : [];
        });
      })
    )
    .sort((a, b) => Number(b.swatch.kind === 'fill') - Number(a.swatch.kind === 'fill'));
  return name => findNamed(swatches, name, swatch => swatch.name)?.swatch;
}
