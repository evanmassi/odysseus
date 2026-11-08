import { create } from 'zustand';

export type TrayMode = 'step' | 'formula';

export type TrayInsertion =
  | { kind: 'name'; name: string }
  | { kind: 'operator'; token: string }
  | { kind: 'preset'; text: string };

export interface InsertTarget {
  element: HTMLElement;
  anchor: HTMLElement;
  mode: TrayMode;
  insert: (insertion: TrayInsertion) => void;
  placeCaretAt: (x: number, y: number) => void;
}

interface InsertTrayState {
  target?: InsertTarget;
  isOpen: boolean;
  focusTarget: (target: InsertTarget) => void;
  releaseTarget: (element: HTMLElement) => void;
  toggleOpen: () => void;
}

export const useInsertTrayStore = create<InsertTrayState>(set => ({
  target: undefined,
  isOpen: false,
  focusTarget: target => set({ target }),
  releaseTarget: element =>
    set(state => (state.target?.element === element ? { target: undefined } : {})),
  toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),
}));
