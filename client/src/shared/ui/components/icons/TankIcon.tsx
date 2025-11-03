import { Icon } from 'lucide-react';
import { refrigeratorFreezer } from '@lucide/lab';

interface TankIconProps {
  size?: number;
  className?: string;
}

export function TankIcon({ size = 24, className = '' }: TankIconProps) {
  return <Icon iconNode={refrigeratorFreezer} size={size} className={className} />;
}
