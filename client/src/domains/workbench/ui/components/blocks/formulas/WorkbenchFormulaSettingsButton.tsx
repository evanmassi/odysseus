import { Button } from '@shared/ui';

import type { WorkedOutSettings } from './WorkbenchFormulaWorkedOutGroup';

interface WorkbenchFormulaSettingsButtonProps {
  settings: WorkedOutSettings;
  onShowBlock: (blockId: string) => void;
}

export function WorkbenchFormulaSettingsButton({
  settings,
  onShowBlock,
}: WorkbenchFormulaSettingsButtonProps) {
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
