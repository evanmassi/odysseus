/**
 * Grid Clipboard Store
 *
 * Ephemeral clipboard data for grid copy/cut/paste.
 */

import { create } from 'zustand';

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';

interface GridClipboardState {
  clipboard: ClipboardData | null;
  setClipboard: (clipboard: ClipboardData | null) => void;
}

export const useGridClipboardStore = create<GridClipboardState>(set => ({
  clipboard: null,
  setClipboard: clipboard => set({ clipboard }),
}));
