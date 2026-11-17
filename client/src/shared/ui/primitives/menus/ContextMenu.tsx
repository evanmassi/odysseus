import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { DropdownMenu } from './DropdownMenu';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
}

const VIEWPORT_PADDING = 8;
const ESTIMATED_MENU_WIDTH = 208;
const ESTIMATED_MENU_HEIGHT = 280;

export function ContextMenu({ isOpen, position, onClose, children }: ContextMenuProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState(position);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const width = measureRef.current?.offsetWidth ?? ESTIMATED_MENU_WIDTH;
    const height = measureRef.current?.offsetHeight ?? ESTIMATED_MENU_HEIGHT;
    let x = position.x;
    let y = position.y;
    if (x + width > window.innerWidth - VIEWPORT_PADDING) x = x - width;
    if (y + height > window.innerHeight - VIEWPORT_PADDING) y = y - height;
    setPlaced({ x: Math.max(VIEWPORT_PADDING, x), y: Math.max(VIEWPORT_PADDING, y) });
  }, [isOpen, position.x, position.y]);

  return (
    <DropdownMenu
      isOpen={isOpen}
      onClose={onClose}
      portal
      motion="instant"
      aria-label="Context menu"
      className="min-w-52"
      style={{ top: placed.y, left: placed.x, transformOrigin: 'top left' }}
    >
      <div ref={measureRef}>{children}</div>
    </DropdownMenu>
  );
}
