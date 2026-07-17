/**
 * Linked Person Cell
 *
 * Table cell for a user's linked researcher (or a researcher's linked user):
 * an accent icon + name, a Deactivated chip when inactive, or a "None" chip when
 * unlinked. Toned for the settings-modal (card) or dashboard (console) surface.
 */

import { Link2 } from 'lucide-react';

import { Chip } from '@shared/ui';

interface LinkedPersonCellProps {
  /** Name/username of the linked person, or null when unlinked. */
  label: string | null;
  deactivated: boolean;
  tone: 'card' | 'console';
  sans?: boolean;
}

export function LinkedPersonCell({ label, deactivated, tone, sans }: LinkedPersonCellProps) {
  if (label === null) {
    return (
      <Chip size="sm" color="outlined">
        None
      </Chip>
    );
  }

  const textClass =
    tone === 'card'
      ? deactivated
        ? 'text-muted-foreground opacity-60'
        : 'text-card-foreground'
      : deactivated
        ? 'text-foreground/50'
        : 'text-foreground';
  const iconClass = !deactivated
    ? 'text-success-text'
    : tone === 'card'
      ? 'text-muted-foreground'
      : 'text-foreground/30';

  return (
    <div className="flex flex-col gap-0.5">
      <div className={`flex items-center gap-1.5 whitespace-nowrap text-body-sm ${textClass}`}>
        <Link2 size={14} className={`shrink-0 ${iconClass}`} />
        <span className={sans ? 'font-sans' : undefined}>{label}</span>
      </div>
      {deactivated && (
        <Chip size="sm" color="default" className="w-fit">
          Deactivated
        </Chip>
      )}
    </div>
  );
}
