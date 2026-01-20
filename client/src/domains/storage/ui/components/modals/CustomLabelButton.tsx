import React from 'react';

import { Tag } from 'lucide-react';

import { Tooltip } from '@shared/ui';

interface CustomLabelButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
}

export function CustomLabelButton({
  onClick,
  size = 14,
  className = 'text-secondary-foreground hover:bg-black/10 transition-colors p-1 rounded',
}: CustomLabelButtonProps) {
  return (
    <Tooltip content="Edit custom label" side="bottom">
      <button onClick={onClick} className={className}>
        <Tag size={size} />
      </button>
    </Tooltip>
  );
}
