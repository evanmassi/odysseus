import { create } from 'zustand';

interface FluorAddRequest {
  id: number;
  typedName: string;
  onAdded: (name: string) => void;
}

interface FluorAddState {
  request: FluorAddRequest | undefined;
  askToAdd: (typedName: string, onAdded: (name: string) => void) => void;
  close: () => void;
}

let nextRequestId = 1;

export const useFluorAddStore = create<FluorAddState>(set => ({
  request: undefined,
  askToAdd: (typedName, onAdded) => set({ request: { id: nextRequestId++, typedName, onAdded } }),
  close: () => set({ request: undefined }),
}));
