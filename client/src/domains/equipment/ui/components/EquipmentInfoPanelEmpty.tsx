/**
 * Equipment Info Panel — Empty State
 *
 * Shown in place of the equipment info panel when no item is selected.
 */
import { Microscope, NotepadText } from 'lucide-react';

import { HeaderStrip, PanelEmptyState, PanelHeader } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

export function EquipmentInfoPanelEmpty() {
  return (
    <ConsolePanel intensity="soft" className="flex flex-col">
      <div className="flex-shrink-0 border-b border-line-faint pr-4">
        <PanelHeader icon={<NotepadText className="h-4 w-4" />} title="Equipment Information" />
      </div>

      <HeaderStrip className="px-4 py-2.5" tone="neutral">
        <div className="flex items-baseline gap-2">
          <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
            <span aria-hidden className="h-2.5 w-0.5 bg-muted-foreground/40" />
            Status
          </span>
          <span className="min-w-0 truncate font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
            —
          </span>
        </div>
      </HeaderStrip>

      <div className="p-4">
        <PanelEmptyState icon={Microscope} message="Select equipment to view details" />
      </div>
    </ConsolePanel>
  );
}
