import { useMemo } from 'react';

import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useWorkbenchStore } from '../stores/workbenchStore';

import type { Protocol, ProtocolCard } from '@odysseus/shared-schemas';

type WorkbenchState = ReturnType<typeof useWorkbenchStore.getState>;

export type ProtocolOutsidePages = Omit<Protocol, 'pages'>;

const isSameOutsidePages = (a: Protocol, b: Protocol) =>
  (Object.keys(a) as Array<keyof Protocol>).every(key => key === 'pages' || a[key] === b[key]);

const isSameData = <Value>(a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);

const isSameEntries = <Entry>(a: readonly Entry[], b: readonly Entry[]) =>
  a.length === b.length && a.every((entry, index) => entry === b[index]);

export const useProtocolOutsidePages = (): ProtocolOutsidePages =>
  useStoreWithEqualityFn(useWorkbenchStore, state => state.protocol, isSameOutsidePages);

export const useWorkbenchData = <Value>(select: (state: WorkbenchState) => Value): Value =>
  useStoreWithEqualityFn(useWorkbenchStore, select, isSameData);

type ProtocolData = Pick<Protocol, 'cards' | 'materials' | 'values' | 'calculations'>;

export function useProtocolWith(...types: ProtocolCard['type'][]): ProtocolData {
  const cards = useStoreWithEqualityFn(
    useWorkbenchStore,
    state => state.protocol.cards.filter(card => types.includes(card.type)),
    isSameEntries
  );
  const materials = useWorkbenchStore(state => state.protocol.materials);
  const values = useWorkbenchStore(state => state.protocol.values);
  const calculations = useWorkbenchStore(state => state.protocol.calculations);
  return useMemo(
    () => ({ cards, materials, values, calculations }),
    [cards, materials, values, calculations]
  );
}

export const useCardsOf = <Type extends ProtocolCard['type']>(
  type: Type
): Extract<ProtocolCard, { type: Type }>[] =>
  useStoreWithEqualityFn(
    useWorkbenchStore,
    state =>
      state.protocol.cards.filter(
        (card): card is Extract<ProtocolCard, { type: Type }> => card.type === type
      ),
    isSameEntries
  );
