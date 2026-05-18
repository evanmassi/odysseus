/**
 * Section Toolbar
 *
 * Controls strip paired with SectionHeader — left slot for filters,
 * right slot for actions. Renders nothing when both slots are empty.
 */

import type { ReactNode } from 'react';

import { CrtBackdrop } from '../../crt-backdrop/CrtBackdrop';

export interface SectionToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function SectionToolbar({ left, right, className }: SectionToolbarProps) {
  if (!left && !right) return null;
  return (
    <CrtBackdrop size="sm" className={`mb-3 ${className ?? ''}`}>
      <div className="relative flex items-center gap-3 px-3.5 py-2">
        {left && <div className="flex items-center gap-2">{left}</div>}
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
    </CrtBackdrop>
  );
}
