/**
 * Lazy Modal Boundary
 *
 * Suspense boundary for lazily-loaded modals — shows a modal-shaped skeleton
 * while the chunk loads.
 */

import type { ComponentProps, ReactNode } from 'react';

import { ModalSkeleton } from '../loading/ModalSkeleton';

import { SuspenseBoundary } from './SuspenseBoundary';

interface LazyModalBoundaryProps {
  name: string;
  size?: ComponentProps<typeof ModalSkeleton>['size'];
  children: ReactNode;
}

export function LazyModalBoundary({ name, size = 'lg', children }: LazyModalBoundaryProps) {
  return (
    <SuspenseBoundary fallback={<ModalSkeleton size={size} />} name={name}>
      {children}
    </SuspenseBoundary>
  );
}
