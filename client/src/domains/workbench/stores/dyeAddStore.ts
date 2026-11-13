import { create } from 'zustand';

interface DyeAddRequest {
  id: number;
  typedName: string;
  onAdded: (name: string) => void;
}

interface DyeAddState {
  request: DyeAddRequest | undefined;
  askToAdd: (typedName: string, onAdded: (name: string) => void) => void;
  close: () => void;
}

let nextRequestId = 1;

export const useDyeAddStore = create<DyeAddState>(set => ({
  request: undefined,
  askToAdd: (typedName, onAdded) => set({ request: { id: nextRequestId++, typedName, onAdded } }),
  close: () => set({ request: undefined }),
}));
