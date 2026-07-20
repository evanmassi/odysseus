/**
 * Custom Label Button
 *
 * Inline tag button that opens the custom label editor for a storage resource.
 */

import { Tag } from 'lucide-react';

import { Tooltip } from '@shared/ui';

interface CustomLabelButtonProps {
  onClick: () => void;
  size?: number;
}

export function CustomLabelButton({ onClick, size = 14 }: CustomLabelButtonProps) {
  return (
    <Tooltip content="Edit custom label" side="bottom">
      <button
        type="button"
        onClick={onClick}
        className="text-secondary-foreground hover:bg-shade/10 transition-colors p-1 rounded"
      >
        <Tag size={size} />
      </button>
    </Tooltip>
  );
}
