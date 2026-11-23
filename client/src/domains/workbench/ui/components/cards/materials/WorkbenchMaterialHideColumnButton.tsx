import { X } from 'lucide-react';

import { Tooltip } from '@shared/ui';

interface WorkbenchMaterialHideColumnButtonProps {
  label: string;
  isBeforeLabel: boolean;
  onHide: () => void;
}

export function WorkbenchMaterialHideColumnButton({
  label,
  isBeforeLabel,
  onHide,
}: WorkbenchMaterialHideColumnButtonProps) {
  return (
    <Tooltip content="Hide this column">
      <button
        type="button"
        className={`${isBeforeLabel ? 'mr-1.5' : 'ml-1.5'} inline-flex align-middle text-muted-foreground opacity-0 transition-opacity hover:text-danger-text focus-visible:opacity-100 group-hover/head:opacity-100`}
        aria-label={`Hide ${label}`}
        onClick={onHide}
      >
        <X aria-hidden className="h-3 w-3" />
      </button>
    </Tooltip>
  );
}
