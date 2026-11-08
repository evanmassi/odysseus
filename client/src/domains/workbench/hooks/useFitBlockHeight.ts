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
      const rows = Math.max(MIN_FITTED_ROWS, rowsForHeight(chrome + content.scrollHeight));
      if (rows !== h) fitBlockHeight(id, rows);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(content.firstElementChild ?? content);
    fit();
    return () => observer.disconnect();
  }, [contentRef, fitBlockHeight, h, id, isFitted, shellRef]);
}
