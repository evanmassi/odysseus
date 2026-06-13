/**
 * Key Combo
 *
 * Renders a shortcut string (e.g. "Ctrl+C") as a row of Kbd caps split on "+".
 */

import { Fragment } from 'react';

import { Kbd } from './Kbd';

export interface KeyComboProps {
  /** Shortcut string; "+" separates chord keys (e.g. "Shift+L"). */
  keys: string;
  className?: string;
}

export function KeyCombo({ keys, className = '' }: KeyComboProps) {
  const parts = keys.split('+').map(p => p.trim());
  return (
    <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
      {parts.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && <span className="text-[10px] text-muted-foreground/50">+</span>}
          <Kbd>{part}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}
