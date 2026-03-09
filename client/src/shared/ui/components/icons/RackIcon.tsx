/**
 * Rack Storage Icon
 *
 * Semantic wrapper around Lucide's Rows3 icon for storage hierarchy.
 */

import { Rows3 } from 'lucide-react';

interface RackIconProps {
  size?: number;
  className?: string;
}

export function RackIcon({ size = 24, className = '' }: RackIconProps) {
  return <Rows3 size={size} className={className} />;
}
