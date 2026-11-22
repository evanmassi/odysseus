import { labwareTitle } from '../plateMap/plateMapTabs';

import type {
  LinkedPlateMapBlock,
  Protocol,
  ProtocolBlock,
  PlateMapBlock,
} from '@odysseus/shared-schemas';

export const linkedPlateMapsOf = (
  blocks: readonly ProtocolBlock[],
  plateId: string
): LinkedPlateMapBlock[] =>
  blocks.filter(
    (block): block is LinkedPlateMapBlock => block.type === 'plateView' && block.shows === plateId
  );

export const shownPlate = (source: PlateMapBlock, view: LinkedPlateMapBlock): PlateMapBlock => ({
  ...source,
  side: view.side,
  activeTab: view.activeTab,
  mergesReplicates: view.mergesReplicates,
});

const pageName = (protocol: Pick<Protocol, 'pages'>, pageId: string) =>
  protocol.pages.find(page => page.id === pageId)?.name ?? 'another page';

export function removalMessage(
  protocol: Pick<Protocol, 'pages' | 'blocks'>,
  block: ProtocolBlock
): string {
  const title = block.type === 'plate' ? labwareTitle(block) : block.title;
  const asked = `Remove the "${title}" card from this page?`;
  if (block.type === 'plateView') {
    const source = protocol.blocks.find(candidate => candidate.id === block.shows);
    return source
      ? `Remove this card? Its plates stay on ${pageName(protocol, source.page)}.`
      : asked;
  }
  const [heir] = block.type === 'plate' ? linkedPlateMapsOf(protocol.blocks, block.id) : [];
  return heir
    ? `${asked} Its plates move to the card on ${pageName(protocol, heir.page)}, so nothing is lost.`
    : asked;
}

export function removeBlock(draft: Protocol, blockId: string): void {
  const removed = draft.blocks.find(block => block.id === blockId);
  if (!removed) return;
  const [heir] = removed.type === 'plate' ? linkedPlateMapsOf(draft.blocks, removed.id) : [];
  if (removed.type !== 'plate' || !heir) {
    draft.blocks = draft.blocks.filter(block => block !== removed);
    return;
  }
  Object.assign(removed, {
    page: heir.page,
    x: heir.x,
    y: heir.y,
    w: heir.w,
    h: heir.h,
    isCollapsed: heir.isCollapsed,
    side: heir.side,
    activeTab: heir.activeTab,
    mergesReplicates: heir.mergesReplicates,
  });
  if (heir.expandedHeight === undefined) delete removed.expandedHeight;
  else removed.expandedHeight = heir.expandedHeight;
  draft.blocks = draft.blocks.filter(block => block !== heir);
}
