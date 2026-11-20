import { useLayoutEffect, useState, type RefObject } from 'react';

const GAP = 12;
const MARGIN = 8;
const OFF_SCREEN = { left: -9999, top: 0 };

function placeBeside(anchor: DOMRect, panel: HTMLElement) {
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const fitsRight = anchor.right + GAP + width <= window.innerWidth - MARGIN;
  const fitsLeft = anchor.left - GAP - width >= MARGIN;
  const left = fitsRight
    ? anchor.right + GAP
    : fitsLeft
      ? anchor.left - GAP - width
      : Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - width - MARGIN));
  const top = fitsRight || fitsLeft ? anchor.top : anchor.bottom + MARGIN;
  return { left, top: Math.max(MARGIN, Math.min(top, window.innerHeight - height - MARGIN)) };
}

export function usePlacedBeside(
  panelRef: RefObject<HTMLElement>,
  anchorOf: () => DOMRect | undefined
): { left: number; top: number } {
  const [position, setPosition] = useState(OFF_SCREEN);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const place = () => {
      const anchor = anchorOf();
      if (anchor && panel) setPosition(placeBeside(anchor, panel));
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel) observer.observe(panel);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [panelRef, anchorOf]);

  return position;
}
