import { useEffect, type RefObject } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { BLOCK_TYPES } from '../utils/blocks/blockTypes';
import { rowsForHeight } from '../utils/blocks/boardGeometry';

import type { ProtocolBlock } from '@odysseus/shared-schemas';

const MIN_FITTED_ROWS = 4;

export function useFitBlockHeight(
  block: ProtocolBlock,
  shellRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>
) {
  const fitBlockHeight = useWorkbenchStore(state => state.fitBlockHeight);
  const isFitted = !!BLOCK_TYPES[block.type].fitsContent && !block.isCollapsed;
  const { id, h } = block;

  useEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!isFitted || !shell || !content) return;
    const fit = () => {
      const chrome = shell.offsetHeight - content.clientHeight;
      const inner = content.firstElementChild;
      const needed = inner instanceof HTMLElement ? inner.offsetHeight : content.scrollHeight;
      const rows = Math.max(MIN_FITTED_ROWS, rowsForHeight(chrome + needed));
      if (rows !== h) fitBlockHeight(id, rows);
    };
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(content.firstElementChild ?? content);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [contentRef, fitBlockHeight, h, id, isFitted, shellRef]);
}
