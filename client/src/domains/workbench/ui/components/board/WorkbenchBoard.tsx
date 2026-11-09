import { useMemo, type RefObject } from 'react';

import ReactGridLayout, {
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';

import { BLOCK_ID_ATTRIBUTE } from '../../../hooks/useShowBlock';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BOARD_COLUMNS, BOARD_MARGIN, BOARD_ROW_HEIGHT } from '../../../utils/blocks/boardGeometry';

import { BLOCK_DRAG_HANDLE, WorkbenchBlockShell } from './WorkbenchBlockShell';

import 'react-grid-layout/css/styles.css';

const GRID_CONFIG = {
  cols: BOARD_COLUMNS,
  rowHeight: BOARD_ROW_HEIGHT,
  margin: [BOARD_MARGIN, BOARD_MARGIN] as const,
};
const DRAG_CONFIG = { enabled: true, handle: `.${BLOCK_DRAG_HANDLE}`, cancel: 'button, input' };
const RESIZE_CONFIG = { enabled: true, handles: ['se'] as const };
const MIN_WIDTH = 2;
const MIN_OPEN_HEIGHT = 2;

export function WorkbenchBoard() {
  const blocks = useWorkbenchStore(state => state.protocol.blocks);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const { width, containerRef, mounted } = useContainerWidth();

  const pageBlocks = useMemo(
    () => blocks.filter(block => block.page === activePageId),
    [blocks, activePageId]
  );
  const layout = useMemo<Layout>(
    () =>
      pageBlocks.map(block => ({
        i: block.id,
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        minW: MIN_WIDTH,
        minH: block.isCollapsed ? 1 : MIN_OPEN_HEIGHT,
        isResizable: !block.isCollapsed,
      })),
    [pageBlocks]
  );

  const commitLayout = (next: Layout) =>
    updateProtocol(draft => {
      for (const item of next) {
        const block = draft.blocks.find(candidate => candidate.id === item.i);
        if (!block) continue;
        if (block.x !== item.x) block.x = item.x;
        if (block.y !== item.y) block.y = item.y;
        if (block.w !== item.w) block.w = item.w;
        if (block.h !== item.h) block.h = item.h;
      }
    });

  return (
    // PITFALL: react-grid-layout types its ref for React 19; the app runs React 18, where the object is the same.
    <div ref={containerRef as RefObject<HTMLDivElement>}>
      {!pageBlocks.length && (
        <p className="px-2 py-6 text-body-sm text-muted-foreground">
          Nothing on this page yet. Add a block from the left.
        </p>
      )}
      {mounted && pageBlocks.length > 0 && (
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
          {pageBlocks.map(block => (
            <div key={block.id} {...{ [BLOCK_ID_ATTRIBUTE]: block.id }}>
              <WorkbenchBlockShell block={block} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
