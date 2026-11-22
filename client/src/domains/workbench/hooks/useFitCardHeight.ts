import { useEffect, type RefObject } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';
import { rowsForHeight } from '../utils/cards/boardGeometry';
import { CARD_TYPES } from '../utils/cards/cardTypes';

import type { ProtocolCard } from '@odysseus/shared-schemas';

const MIN_FITTED_ROWS = 4;

export function useFitCardHeight(
  card: ProtocolCard,
  shellRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>
) {
  const fitCardHeight = useWorkbenchStore(state => state.fitCardHeight);
  const isFitted = !!CARD_TYPES[card.type].fitsContent && !card.isCollapsed;
  const { id, h } = card;

  useEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!isFitted || !shell || !content) return;
    const fit = () => {
      const chrome = shell.offsetHeight - content.clientHeight;
      const inner = content.firstElementChild;
      const needed = inner instanceof HTMLElement ? inner.offsetHeight : content.scrollHeight;
      const rows = Math.max(MIN_FITTED_ROWS, rowsForHeight(chrome + needed));
      if (rows !== h) fitCardHeight(id, rows);
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
  }, [contentRef, fitCardHeight, h, id, isFitted, shellRef]);
}
