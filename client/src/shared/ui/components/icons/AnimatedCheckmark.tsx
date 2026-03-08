/**
 * AnimatedCheckmark Component
 *
 * SVG-based animated checkmark with circle stroke animation.
 * Uses Lucide CircleCheckBig's exact geometry for consistency.
 */
import { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
  /** Delay in ms before animation starts (useful when inside animated containers) */
  delay?: number;
}

export function AnimatedCheckmark({
  size = 48,
  className = '',
  delay = 50,
}: AnimatedCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Uses Lucide's 24x24 viewBox with exact CircleCheckBig geometry

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Arc (incomplete circle with gap for checkmark) */}
        <path
          d="M21.801 10A10 10 0 1 1 17 3.335"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          style={{
            strokeDasharray: '100',
            strokeDashoffset: isVisible ? '0' : '100',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1)',
          }}
        />

        {/* Checkmark (extends outside circle) */}
        <path
          d="m9 11 3 3L22 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          style={{
            strokeDasharray: '100',
            strokeDashoffset: isVisible ? '0' : '100',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />
      </svg>
    </div>
  );
}
