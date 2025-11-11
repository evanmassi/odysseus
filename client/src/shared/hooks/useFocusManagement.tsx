import React, { useState, useCallback, useRef, createContext, useContext } from 'react';

export enum FocusZone {
  HEADER = 'header',
  SEARCH = 'search',
  STORAGE_NAVIGATOR = 'storage-navigator',
  GRID = 'grid',
  INFO_PANEL = 'info-panel',
  MODAL = 'modal'
}

interface FocusState {
  activeZone: FocusZone;
  previousZone: FocusZone | null;
  gridFocus: {
    position: number;
    isActive: boolean;
  };
  isModalOpen: boolean;
}

interface FocusZoneContextValue {
  focusState: FocusState;
  setActiveZone: (zone: FocusZone) => void;
  setGridFocus: (position: number) => void;
  clearGridFocus: () => void;
  setModalState: (isOpen: boolean) => void;
  focusGrid: () => void;
  canReceiveKeyboard: (zone: FocusZone) => boolean;
}

const FocusZoneContext = createContext<FocusZoneContextValue | null>(null);

export function FocusZoneProvider({ children }: { children: React.ReactNode }) {
  const [focusState, setFocusState] = useState<FocusState>({
    activeZone: FocusZone.GRID,
    previousZone: null,
    gridFocus: { position: 1, isActive: false },
    isModalOpen: false
  });

  const setActiveZone = useCallback((zone: FocusZone) => {
    setFocusState(prev => ({
      ...prev,
      previousZone: prev.activeZone,
      activeZone: zone
    }));
  }, []);

  const setGridFocus = useCallback((position: number) => {
    setFocusState(prev => ({
      ...prev,
      gridFocus: { position, isActive: true }
    }));
  }, []);

  const clearGridFocus = useCallback(() => {
    setFocusState(prev => ({
      ...prev,
      gridFocus: { ...prev.gridFocus, isActive: false }
    }));
  }, []);

  const setModalState = useCallback((isOpen: boolean) => {
    setFocusState(prev => ({
      ...prev,
      isModalOpen: isOpen,
      activeZone: isOpen ? FocusZone.MODAL : (prev.previousZone ?? FocusZone.GRID)
    }));
  }, []);

  const focusGrid = useCallback(() => {
    setActiveZone(FocusZone.GRID);
  }, [setActiveZone]);

  const canReceiveKeyboard = useCallback((zone: FocusZone) => {
    if (focusState.isModalOpen && zone !== FocusZone.MODAL) {
      return false;
    }
    return focusState.activeZone === zone;
  }, [focusState.activeZone, focusState.isModalOpen]);

  const contextValue: FocusZoneContextValue = {
    focusState,
    setActiveZone,
    setGridFocus,
    clearGridFocus,
    setModalState,
    focusGrid,
    canReceiveKeyboard
  };

  return (
    <FocusZoneContext.Provider value={contextValue}>
      {children}
    </FocusZoneContext.Provider>
  );
}

export function useFocusManagement() {
  const context = useContext(FocusZoneContext);
  if (!context) {
    throw new Error('useFocusManagement must be used within a FocusZoneProvider');
  }
  return context;
}

// Alias for backwards compatibility
export const useFocusZone = useFocusManagement;

// Hook for components to register themselves as focus zones
export function useFocusZoneRegistration(zone: FocusZone) {
  const { setActiveZone, canReceiveKeyboard } = useFocusManagement();
  const elementRef = useRef<HTMLDivElement>(null);

  const registerFocus = useCallback(() => {
    setActiveZone(zone);
  }, [setActiveZone, zone]);

  const isActive = canReceiveKeyboard(zone);

  return {
    elementRef,
    registerFocus,
    isActive
  };
}
