import React from 'react';

import { Tag } from 'lucide-react';

interface CustomLabelButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
}

export function CustomLabelButton({
  onClick,
  size = 14,
  className = 'text-slate-700 hover:bg-black/10 transition-colors p-1 rounded',
}: CustomLabelButtonProps) {
  return (
    <button onClick={onClick} className={className} title="Edit custom label">
      <Tag size={size} />
    </button>
  );
}
