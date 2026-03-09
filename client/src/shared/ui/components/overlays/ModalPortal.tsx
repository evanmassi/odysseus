/**
 * Modal Portal
 *
 * Renders modals outside the app DOM with inert management and nested modal ref counting.
 */

import { useEffect, type ReactNode } from 'react';

import { createPortal } from 'react-dom';

let openModalCount = 0;

interface ModalPortalProps {
  children: ReactNode;
}

function updateInertState(increment: boolean): void {
  const root = document.getElementById('root');
  if (!root) return;

  if (increment) {
    openModalCount++;
    root.setAttribute('inert', '');
  } else {
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount === 0) {
      root.removeAttribute('inert');
    }
  }
}

export function ModalPortal({ children }: ModalPortalProps): ReactNode {
  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;

  useEffect(() => {
    updateInertState(true);
    return () => updateInertState(false);
  }, []);

  const target = modalRoot ?? (typeof document !== 'undefined' ? document.body : null);

  if (!target) return null;

  return createPortal(children, target);
}
