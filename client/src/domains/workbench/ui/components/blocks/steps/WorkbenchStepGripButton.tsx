import type { MouseEvent } from 'react';

import { GripVertical } from 'lucide-react';

import { Tooltip } from '@shared/ui';

interface WorkbenchStepGripButtonProps {
  onGrab: (event: MouseEvent) => void;
}

export function WorkbenchStepGripButton({ onGrab }: WorkbenchStepGripButtonProps) {
  return (
    <Tooltip content="Drag to move">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Drag to move"
        className="flex w-3 flex-none cursor-grab select-none self-center text-foreground/25 opacity-0 transition-opacity hover:text-primary group-hover/step:opacity-100"
        onMouseDown={event => {
          if (event.button === 0) onGrab(event);
        }}
      >
        <GripVertical aria-hidden className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
