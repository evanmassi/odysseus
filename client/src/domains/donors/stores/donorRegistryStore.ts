/**
 * Donor Registry Store
 *
 * Lightweight state for opening the registry modal from anywhere (e.g., TubeInfoPanel).
 */

import { create } from 'zustand';

interface DonorRegistryState {
  isOpen: boolean;
  initialDonorId?: string;
  initialIdType?: 'source' | 'internal';
  open: (donorId?: string, idType?: 'source' | 'internal') => void;
  close: () => void;
}

export const useDonorRegistryStore = create<DonorRegistryState>(set => ({
  isOpen: false,
  initialDonorId: undefined,
  initialIdType: undefined,
  open: (donorId, idType) =>
    set({
      isOpen: true,
      initialDonorId: donorId,
      initialIdType: idType,
    }),
  close: () =>
    set({
      isOpen: false,
      initialDonorId: undefined,
      initialIdType: undefined,
    }),
}));
