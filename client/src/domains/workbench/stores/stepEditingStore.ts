import { create } from 'zustand';

interface StepEditingState {
  editingStepId: string | undefined;
  editStep: (stepId: string | undefined) => void;
}

export const useStepEditingStore = create<StepEditingState>(set => ({
  editingStepId: undefined,
  editStep: stepId => set({ editingStepId: stepId }),
}));
