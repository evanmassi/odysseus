import { createId } from '../ids/createId';

import { BLOCK_TYPES } from './blockTypes';

import type { ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

interface Placement {
  page: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function createBlock<Type extends ProtocolBlockType>(
  type: Type,
  placement: Placement
): ProtocolBlock {
  const blockType = BLOCK_TYPES[type];
  return {
    id: createId(),
    type,
    title: blockType.label,
    isCollapsed: false,
    ...placement,
    ...blockType.createContent(),
  } as ProtocolBlock;
}
