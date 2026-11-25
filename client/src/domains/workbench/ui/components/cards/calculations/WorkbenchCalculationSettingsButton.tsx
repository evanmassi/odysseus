import { Button } from '@shared/ui';

import type { WorkedOutSettings } from './WorkbenchCalculationWorkedOutGroup';
import type { CardTarget } from '../../../../utils/cards/createCard';

interface WorkbenchCalculationSettingsButtonProps {
  settings: WorkedOutSettings;
  onShow: (target: CardTarget) => void;
}

export function WorkbenchCalculationSettingsButton({
  settings,
  onShow,
}: WorkbenchCalculationSettingsButtonProps) {
  return (
    <Button variant="ghost" size="xs" className="flex-none" onClick={() => onShow(settings.target)}>
      Set in {settings.label}
    </Button>
  );
}
