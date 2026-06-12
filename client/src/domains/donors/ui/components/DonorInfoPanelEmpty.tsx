/**
 * Donor Info Panel — Empty State
 *
 * Shown in place of the donor info panel when no donor is selected.
 */
import { BookUser } from 'lucide-react';

import { NubDivider, PanelEmptyState, PanelHeader } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

export function DonorInfoPanelEmpty() {
  return (
    <ConsolePanel intensity="soft" className="flex flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<BookUser className="h-4 w-4" />} title="Donor Information" />
      </div>

      <div className="relative flex-shrink-0 border-b border-line-faint bg-black/35 px-4 py-2.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
        />
        <div className="flex items-baseline gap-2">
          <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
            <span aria-hidden className="h-2.5 w-0.5 bg-muted-foreground/40" />
            Collections
          </span>
          <span className="min-w-0 truncate font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
            —
          </span>
        </div>
        <NubDivider tone="neutral" className="absolute inset-x-0 -bottom-px" />
      </div>

      <div className="p-4">
        <PanelEmptyState icon={BookUser} message="Select a donor to view details" />
      </div>
    </ConsolePanel>
  );
}
