/**
 * Grid Clipboard Store
 *
 * Ephemeral grid state for mouse position and clipboard data.
 */

import { create } from 'zustand';

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';

interface MousePosition {
  x: number;
  y: number;
}

interface GridClipboardState {
  mousePosition: MousePosition | null;
  clipboard: ClipboardData | null;
  setMousePosition: (position: MousePosition | null) => void;
  setClipboard: (clipboard: ClipboardData | null) => void;
  clearClipboard: () => void;
}

export const useGridClipboardStore = create<GridClipboardState>(set => ({
  mousePosition: null,
  clipboard: null,

  setMousePosition: position => set({ mousePosition: position }),
  setClipboard: clipboard => set({ clipboard }),
  clearClipboard: () => set({ clipboard: null }),
}));
