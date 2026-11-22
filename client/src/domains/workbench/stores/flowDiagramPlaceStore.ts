import { create } from 'zustand';

interface FlowDiagramPlaceState {
  placeByCard: Readonly<Record<string, string | undefined>>;
  setPlace: (cardId: string, stepId: string | undefined) => void;
}

export const useFlowDiagramPlaceStore = create<FlowDiagramPlaceState>(set => ({
  placeByCard: {},
  setPlace: (cardId, stepId) =>
    set(state => ({ placeByCard: { ...state.placeByCard, [cardId]: stepId } })),
}));
