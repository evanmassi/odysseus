import { createId } from '../ids/createId';

import { BLOCK_TYPES } from './blockTypes';

import type { Protocol, ProtocolBlock, ProtocolBlockType } from '@odysseus/shared-schemas';

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

const NEW_BLOCK_WIDTH = 12;

export function firstBlockOrNew<Type extends ProtocolBlockType>(
  draft: Protocol,
  type: Type
): Extract<ProtocolBlock, { type: Type }> {
  const isWanted = (block: ProtocolBlock): block is Extract<ProtocolBlock, { type: Type }> =>
    block.type === type;
  const existing = draft.blocks.find(isWanted);
  if (existing) return existing;
  const page = draft.pages[0].id;
  const bottom = Math.max(
    0,
    ...draft.blocks.filter(block => block.page === page).map(block => block.y + block.h)
  );
  const created = createBlock(type, {
    page,
    x: 0,
    y: bottom,
    w: NEW_BLOCK_WIDTH,
    h: BLOCK_TYPES[type].size[1],
  });
  draft.blocks.push(created);
  return created as Extract<ProtocolBlock, { type: Type }>;
}
