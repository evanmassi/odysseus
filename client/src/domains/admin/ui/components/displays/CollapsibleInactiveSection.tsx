/**
 * Collapsible Inactive Section
 *
 * A toggle that reveals a table of inactive/archived rows, set off by a divider
 * (settings-modal tabs) or a fading stripe (dashboard panels).
 */

import { useState, type ReactNode } from 'react';

import { ChevronDown } from 'lucide-react';

const STRIPE =
  "relative mt-3 pt-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:[background:linear-gradient(90deg,hsl(var(--foreground)/0.18)_0%,hsl(var(--foreground)/0.14)_42%,hsl(var(--foreground)/0.06)_82%,transparent_100%)]";

interface CollapsibleInactiveSectionProps {
  label: string;
  count: number;
  variant: 'divider' | 'stripe';
  children: ReactNode;
}

export function CollapsibleInactiveSection({
  label,
  count,
  variant,
  children,
}: CollapsibleInactiveSectionProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={variant === 'divider' ? 'pt-3 border-t border-border' : STRIPE}>
      <button
        onClick={() => setShow(prev => !prev)}
        className="flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${show ? 'rotate-0' : '-rotate-90'}`}
        />
        {label} ({count})
      </button>
      {show && <div className="mt-2">{children}</div>}
    </div>
  );
}
