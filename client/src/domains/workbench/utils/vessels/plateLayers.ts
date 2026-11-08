import { isFilledCell, type PlateLine, type VesselMapBlock } from '@odysseus/shared-schemas';

import { wellLine, wellLineText } from './wellContents';

import type { BoardCalculation } from '../formulas/boardCalculation';

export type ShownRole = Exclude<PlateLine['role'], 'auto'>;

interface LineLayer {
  line: PlateLine;
  role: ShownRole;
  texts: string[];
}

export function lineLayers(
  block: VesselMapBlock,
  colorLine: PlateLine | undefined,
  calculation: BoardCalculation
): LineLayer[] {
  const usedKeys = Object.keys(block.cells).filter(key =>
    Object.values(block.cells[key]).some(isFilledCell)
  );
  return block.lines.flatMap(line => {
    const keysOnLine = usedKeys.filter(key => isFilledCell(block.cells[key][line.id]));
    if (!keysOnLine.length) return [];
    const texts = [
      ...new Set(
        keysOnLine.flatMap(key => {
          const shown = wellLine(block, key, line, calculation);
          return shown ? [wellLineText(shown)] : [];
        })
      ),
    ];
    const isOnEveryWell = keysOnLine.length === usedKeys.length && texts.length === 1;
    const autoRole: ShownRole = line === colorLine ? 'color' : isOnEveryWell ? 'caption' : 'band';
    return [{ line, role: line.role === 'auto' ? autoRole : line.role, texts }];
  });
}

export const plateCaptions = (layers: readonly LineLayer[]): string[] =>
  layers.flatMap(({ role, texts }) => {
    const text = texts.filter(Boolean).join(', ');
    return role === 'caption' && text ? [text] : [];
  });
