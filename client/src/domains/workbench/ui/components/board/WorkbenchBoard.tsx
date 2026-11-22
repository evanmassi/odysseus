import { useMemo, type RefObject } from 'react';

import ReactGridLayout, {
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';

import { CARD_ID_ATTRIBUTE } from '../../../hooks/useShowCard';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BOARD_COLUMNS, BOARD_MARGIN, BOARD_ROW_HEIGHT } from '../../../utils/cards/boardGeometry';

import { CARD_DRAG_HANDLE, WorkbenchCardShell } from './WorkbenchCardShell';

import 'react-grid-layout/css/styles.css';

const GRID_CONFIG = {
  cols: BOARD_COLUMNS,
  rowHeight: BOARD_ROW_HEIGHT,
  margin: [BOARD_MARGIN, BOARD_MARGIN] as const,
};
const DRAG_CONFIG = { enabled: true, handle: `.${CARD_DRAG_HANDLE}`, cancel: 'button, input' };
const RESIZE_CONFIG = { enabled: true, handles: ['se'] as const };
const MIN_WIDTH = 2;
const MIN_OPEN_HEIGHT = 2;

export function WorkbenchBoard() {
  const cards = useWorkbenchStore(state => state.protocol.blocks);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const { width, containerRef, mounted } = useContainerWidth();

  const pageCards = useMemo(
    () => cards.filter(card => card.page === activePageId),
    [cards, activePageId]
  );
  const layout = useMemo<Layout>(
    () =>
      pageCards.map(card => ({
        i: card.id,
        x: card.x,
        y: card.y,
        w: card.w,
        h: card.h,
        minW: MIN_WIDTH,
        minH: card.isCollapsed ? 1 : MIN_OPEN_HEIGHT,
        isResizable: !card.isCollapsed,
      })),
    [pageCards]
  );

  const commitLayout = (next: Layout) =>
    updateProtocol(draft => {
      for (const item of next) {
        const card = draft.blocks.find(candidate => candidate.id === item.i);
        if (!card) continue;
        if (card.x !== item.x) card.x = item.x;
        if (card.y !== item.y) card.y = item.y;
        if (card.w !== item.w) card.w = item.w;
        if (card.h !== item.h) card.h = item.h;
      }
    });

  return (
    // PITFALL: react-grid-layout types its ref for React 19; the app runs React 18, where the object is the same.
    // PITFALL: the grid animates its own height, and the board scroll area would measure it mid-animation and leave the bottom out of reach.
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="[&>.react-grid-layout]:transition-none"
    >
      {!pageCards.length && (
        <p className="px-2 py-6 text-body-sm text-muted-foreground">
          Nothing on this page yet. Add a card from the left.
        </p>
      )}
      {mounted && pageCards.length > 0 && (
        <ReactGridLayout
          width={width}
          layout={layout}
          gridConfig={GRID_CONFIG}
          dragConfig={DRAG_CONFIG}
          resizeConfig={RESIZE_CONFIG}
          compactor={verticalCompactor}
          onDragStop={commitLayout}
          onResizeStop={commitLayout}
        >
          {pageCards.map(card => (
            <div key={card.id} {...{ [CARD_ID_ATTRIBUTE]: card.id }}>
              <WorkbenchCardShell card={card} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
