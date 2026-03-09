/**
 * Box Storage Icon
 *
 * Semantic wrapper around Lucide's Box icon for storage hierarchy.
 */

import { Box } from 'lucide-react';

interface BoxIconProps {
  size?: number;
  className?: string;
}

export function BoxIcon({ size = 24, className = '' }: BoxIconProps) {
  return <Box size={size} className={className} />;
}
