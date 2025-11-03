import { Rows3 } from 'lucide-react';

interface RackIconProps {
  size?: number;
  className?: string;
}

export function RackIcon({ size = 24, className = '' }: RackIconProps) {
  return <Rows3 size={size} className={className} />;
}
