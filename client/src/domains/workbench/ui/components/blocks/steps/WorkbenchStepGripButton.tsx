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
        className="absolute inset-y-0 -left-4 flex w-5 cursor-grab select-none items-center justify-center text-foreground/25 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover/step:opacity-100"
        onMouseDown={event => {
          if (event.button === 0) onGrab(event);
        }}
      >
        <GripVertical aria-hidden className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}
