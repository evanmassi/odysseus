import { Button } from '@shared/ui';

import type { WorkedOutSettings } from './WorkbenchCalculationWorkedOutGroup';

interface WorkbenchCalculationSettingsButtonProps {
  settings: WorkedOutSettings;
  onShowCard: (cardId: string) => void;
}

export function WorkbenchCalculationSettingsButton({
  settings,
  onShowCard,
}: WorkbenchCalculationSettingsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="flex-none"
      onClick={() => onShowCard(settings.cardId)}
    >
      Set in {settings.label}
    </Button>
  );
}
