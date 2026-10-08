import { createContext, useContext, type ReactNode } from 'react';

import { createPortal } from 'react-dom';

export const BulkFooterSlotContext = createContext<HTMLElement | null>(null);

export function BulkTabFooter({ children }: { children: ReactNode }) {
  const slot = useContext(BulkFooterSlotContext);
  return slot ? createPortal(children, slot) : null;
}
