import { Button } from '@shared/ui';

import type { WorkedOutSettings } from './WorkbenchCalculationWorkedOutGroup';

interface WorkbenchCalculationSettingsButtonProps {
  settings: WorkedOutSettings;
  onShowBlock: (blockId: string) => void;
}

export function WorkbenchCalculationSettingsButton({
  settings,
  onShowBlock,
}: WorkbenchCalculationSettingsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="flex-none"
      onClick={() => onShowBlock(settings.blockId)}
    >
      Set in {settings.label}
    </Button>
  );
}
