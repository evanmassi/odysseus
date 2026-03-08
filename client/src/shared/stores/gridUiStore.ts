/**
 * Grid UI Store
 * Manages ephemeral grid UI state (mouse position, clipboard)
 */

import { create } from 'zustand';

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';

interface MousePosition {
  x: number;
  y: number;
}

interface GridUiState {
  mousePosition: MousePosition | null;
  clipboard: ClipboardData | null;

  // Actions
  setMousePosition: (position: MousePosition | null) => void;
  setClipboard: (clipboard: ClipboardData | null) => void;
  clearClipboard: () => void;
}

export const useGridUiStore = create<GridUiState>(set => ({
  mousePosition: null,
  clipboard: null,

  setMousePosition: position => set({ mousePosition: position }),
  setClipboard: clipboard => set({ clipboard }),
  clearClipboard: () => set({ clipboard: null }),
}));
