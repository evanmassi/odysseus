import type {
  PlateViewBlock,
  Protocol,
  ProtocolBlock,
  VesselMapBlock,
} from '@odysseus/shared-schemas';

export const viewsOf = (blocks: readonly ProtocolBlock[], plateId: string): PlateViewBlock[] =>
  blocks.filter(
    (block): block is PlateViewBlock => block.type === 'plateView' && block.shows === plateId
  );

export const shownPlate = (source: VesselMapBlock, view: PlateViewBlock): VesselMapBlock => ({
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
  const asked = `Remove the “${block.title}” block from this page?`;
  if (block.type === 'plateView') {
    const source = protocol.blocks.find(candidate => candidate.id === block.shows);
    return source
      ? `Remove this view of “${source.title}”? Its plates stay on ${pageName(protocol, source.page)}.`
      : asked;
  }
  const [heir] = block.type === 'plate' ? viewsOf(protocol.blocks, block.id) : [];
  return heir
    ? `${asked} Its plates move to the view on ${pageName(protocol, heir.page)}, so nothing is lost.`
    : asked;
}

export function removeBlock(draft: Protocol, blockId: string): void {
  const removed = draft.blocks.find(block => block.id === blockId);
  if (!removed) return;
  const [heir] = removed.type === 'plate' ? viewsOf(draft.blocks, removed.id) : [];
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
