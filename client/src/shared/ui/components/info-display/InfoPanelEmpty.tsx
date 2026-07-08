/**
 * Info Panel — Empty State
 *
 * Shown in place of a detail info panel when no record is selected. Backs the
 * equipment, supplies, and donor panels; parametrized by title, icons, and the
 * status-strip label.
 */

import { NotepadText, type LucideIcon } from 'lucide-react';

import { ConsolePanel } from '../../primitives/console-panel/ConsolePanel';
import { HeaderStrip } from '../../primitives/header-strip/HeaderStrip';
import { PanelEmptyState } from '../../primitives/panel-empty-state/PanelEmptyState';
import { PanelHeader } from '../../primitives/titles/PanelHeader';

interface InfoPanelEmptyProps {
  title: string;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  headerIcon?: LucideIcon;
  stripLabel?: string;
}

export function InfoPanelEmpty({
  title,
  emptyIcon,
  emptyMessage,
  headerIcon: HeaderIcon = NotepadText,
  stripLabel = 'Status',
}: InfoPanelEmptyProps) {
  return (
    <ConsolePanel intensity="soft" className="flex flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<HeaderIcon className="h-4 w-4" />} title={title} />
      </div>

      <HeaderStrip className="px-4 py-2.5" tone="neutral">
        <div className="flex items-baseline gap-2">
          <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
            <span aria-hidden className="h-2.5 w-0.5 bg-muted-foreground/40" />
            {stripLabel}
          </span>
          <span className="min-w-0 truncate font-mono text-data-sm tracking-[0.06em] text-muted-foreground">
            —
          </span>
        </div>
      </HeaderStrip>

      <div className="p-4">
        <PanelEmptyState icon={emptyIcon} message={emptyMessage} />
      </div>
    </ConsolePanel>
  );
}
