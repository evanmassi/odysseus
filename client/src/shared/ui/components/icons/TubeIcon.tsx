/**
 * Tube Inventory Icon
 *
 * Semantic wrapper around Lucide's TestTubeDiagonal icon for tube records.
 */

import { TestTubeDiagonal } from 'lucide-react';

interface TubeIconProps {
  size?: number;
  className?: string;
}

export function TubeIcon({ size = 24, className = '' }: TubeIconProps) {
  return <TestTubeDiagonal size={size} className={className} />;
}
