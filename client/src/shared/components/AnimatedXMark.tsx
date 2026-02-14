/**
 * AnimatedXMark Component
 *
 * SVG-based animated X mark with circle stroke animation.
 * Uses Lucide CircleX's exact geometry for consistency.
 * Used as error/danger indicator for alerts and feedback.
 */
import { useEffect, useState } from 'react';

interface AnimatedXMarkProps {
  size?: number;
  className?: string;
}

export function AnimatedXMark({ size = 48, className = '' }: AnimatedXMarkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Uses Lucide's 24x24 viewBox with exact CircleX geometry

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

        {/* X Line 1: top-right to bottom-left (Lucide: m15 9-6 6) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="m15 9-6 6"
          style={{
            strokeDasharray: '9',
            strokeDashoffset: isVisible ? '0' : '9',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />

        {/* X Line 2: top-left to bottom-right (Lucide: m9 9 6 6) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="m9 9 6 6"
          style={{
            strokeDasharray: '9',
            strokeDashoffset: isVisible ? '0' : '9',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.7s',
          }}
        />
      </svg>
    </div>
  );
}
