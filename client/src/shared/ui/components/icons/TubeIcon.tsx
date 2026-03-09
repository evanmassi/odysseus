/**
 * Tube Inventory Icon
 *
 * Semantic wrapper around Lucide's TestTube icon for tube records.
 */

import { TestTube } from 'lucide-react';

interface TubeIconProps {
  size?: number;
  className?: string;
}

export function TubeIcon({ size = 24, className = '' }: TubeIconProps) {
  return <TestTube size={size} className={className} />;
}
