import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useWorkbenchStore } from '../stores/workbenchStore';

import type { Protocol, ProtocolBlock } from '@odysseus/shared-schemas';

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

export const useBlocksOf = <Type extends ProtocolBlock['type']>(
  type: Type
): Extract<ProtocolBlock, { type: Type }>[] =>
  useStoreWithEqualityFn(
    useWorkbenchStore,
    state =>
      state.protocol.blocks.filter(
        (block): block is Extract<ProtocolBlock, { type: Type }> => block.type === type
      ),
    isSameEntries
  );
