import { create } from 'zustand';

interface FlowPlaceState {
  placeByBlock: Readonly<Record<string, string | undefined>>;
  setPlace: (blockId: string, stepId: string | undefined) => void;
}

export const useFlowPlaceStore = create<FlowPlaceState>(set => ({
  placeByBlock: {},
  setPlace: (blockId, stepId) =>
    set(state => ({ placeByBlock: { ...state.placeByBlock, [blockId]: stepId } })),
}));
