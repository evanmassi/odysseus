import { unitScale, type UnitDimension } from '@odysseus/shared-schemas';

import { isSameDimension } from './quantities';

import type { WorkingFraction, WorkingNode } from './workingTree';

export type UnitPart = 'top' | 'bottom';

export interface QuantityText {
  amount: string;
  unit: string;
}

interface UnitToken {
  node: WorkingNode;
  part: UnitPart;
  dimension: UnitDimension;
  isAbove: boolean;
}

const AMOUNT_AND_UNIT = /^(\S+)\s+(.+)$/;

export function quantityText(text: string): QuantityText {
  const match = AMOUNT_AND_UNIT.exec(text.trim());
  return match ? { amount: match[1], unit: match[2] } : { amount: text, unit: '' };
}

export function unitParts(unit: string): Record<UnitPart, string> {
  const [top, ...bottom] = unit.split('/');
  return { top, bottom: bottom.join('/') };
}

function unitTokens(node: WorkingNode, isOver: boolean): UnitToken[] {
  if (node.kind !== 'ref' && node.kind !== 'literal') return [];
  const parts = unitParts(quantityText(node.text).unit);
  return (['top', 'bottom'] as const).flatMap(part => {
    const dimension = parts[part] ? unitScale(parts[part])?.dimension : undefined;
    if (!dimension || !Object.keys(dimension).length) return [];
    return [{ node, part, dimension, isAbove: (part === 'top') === isOver }];
  });
}

export function cancelledUnits(fraction: WorkingFraction): Map<WorkingNode, Set<UnitPart>> {
  const tokens = [
    ...fraction.over.flatMap(node => unitTokens(node, true)),
    ...fraction.under.flatMap(node => unitTokens(node, false)),
  ];
  const below = tokens.filter(token => !token.isAbove);
  const cancelled = new Map<WorkingNode, Set<UnitPart>>();
  const strike = ({ node, part }: UnitToken) =>
    cancelled.set(node, new Set([...(cancelled.get(node) ?? []), part]));
  for (const above of tokens.filter(token => token.isAbove)) {
    const index = below.findIndex(token => isSameDimension(token.dimension, above.dimension));
    if (index < 0) continue;
    strike(above);
    strike(below.splice(index, 1)[0]);
  }
  return cancelled;
}
