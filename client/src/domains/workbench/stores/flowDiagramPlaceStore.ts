import { create } from 'zustand';

interface FlowDiagramPlaceState {
  placeByBlock: Readonly<Record<string, string | undefined>>;
  setPlace: (blockId: string, stepId: string | undefined) => void;
}

export const useFlowDiagramPlaceStore = create<FlowDiagramPlaceState>(set => ({
  placeByBlock: {},
  setPlace: (blockId, stepId) =>
    set(state => ({ placeByBlock: { ...state.placeByBlock, [blockId]: stepId } })),
}));
