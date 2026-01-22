/**
 * AnimatedCheckmark Component
 *
 * SVG-based animated checkmark with circle stroke animation.
 * Uses Lucide CircleCheck's exact geometry for consistency.
 * Used as success indicator for form submissions.
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

  // Uses Lucide's 24x24 viewBox with exact CircleCheck geometry

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Circle (Lucide: cx=12, cy=12, r=10) */}
        <circle
          cx="12"
          cy="12"
          r="10"
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

        {/* Checkmark (Lucide: m9 12 2 2 4-4) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9 12 2 2 4-4"
          style={{
            strokeDasharray: '9',
            strokeDashoffset: isVisible ? '0' : '9',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />
      </svg>
    </div>
  );
}
