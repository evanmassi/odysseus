/**
 * Donor Info Panel — Empty State
 *
 * Shown in place of the donor info panel when no donor is selected.
 */
import { BookUser } from 'lucide-react';

import { HeaderStrip, PanelEmptyState, PanelHeader } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

export function DonorInfoPanelEmpty() {
  return (
    <ConsolePanel intensity="soft" className="flex flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<BookUser className="h-4 w-4" />} title="Donor Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5" tone="neutral">
        <div className="flex items-baseline gap-2">
          <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
            <span aria-hidden className="h-2.5 w-0.5 bg-muted-foreground/40" />
            Collections
          </span>
          <span className="min-w-0 truncate font-mono text-data-sm tracking-[0.06em] text-muted-foreground">
            —
          </span>
        </div>
      </HeaderStrip>

      <div className="p-4">
        <PanelEmptyState icon={BookUser} message="Select a donor to view details" />
      </div>
    </ConsolePanel>
  );
}
