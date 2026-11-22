import {
  bandColorOf,
  colorLineOf,
  type Protocol,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { findNamed } from '../materials/materialLookup';

import { lineLayers, markKindOf, type BandKind } from './plateLayers';

import type { BoardCalculation } from '../formulas/boardCalculation';

export interface PlateSwatch {
  color: string;
  kind: BandKind;
}

export type PlateSwatchOf = (name: string) => PlateSwatch | undefined;

export function plateSwatches(
  protocol: Pick<Protocol, 'blocks'>,
  calculation: BoardCalculation
): PlateSwatchOf {
  const swatches = protocol.blocks
    .filter((block): block is VesselMapBlock => block.type === 'plate')
    .flatMap(plate =>
      lineLayers(plate, colorLineOf(plate), calculation).flatMap(({ line, role }) => {
        const kind = markKindOf(role);
        if (!kind) return [];
        return line.values.flatMap(value => {
          const color = kind === 'fill' ? value.color : bandColorOf(plate, value);
          return color ? [{ name: value.text, swatch: { color, kind } }] : [];
        });
      })
    )
    .sort((a, b) => Number(b.swatch.kind === 'fill') - Number(a.swatch.kind === 'fill'));
  return name => findNamed(swatches, name, swatch => swatch.name)?.swatch;
}
