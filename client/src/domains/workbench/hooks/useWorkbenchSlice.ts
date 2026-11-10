import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useWorkbenchStore } from '../stores/workbenchStore';

import type { Protocol } from '@odysseus/shared-schemas';

type WorkbenchState = ReturnType<typeof useWorkbenchStore.getState>;

export type ProtocolOutsidePages = Omit<Protocol, 'pages'>;

const isSameOutsidePages = (a: Protocol, b: Protocol) =>
  (Object.keys(a) as Array<keyof Protocol>).every(key => key === 'pages' || a[key] === b[key]);

const isSameData = <Value>(a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);

export const useProtocolOutsidePages = (): ProtocolOutsidePages =>
  useStoreWithEqualityFn(useWorkbenchStore, state => state.protocol, isSameOutsidePages);

export const useWorkbenchData = <Value>(select: (state: WorkbenchState) => Value): Value =>
  useStoreWithEqualityFn(useWorkbenchStore, select, isSameData);
