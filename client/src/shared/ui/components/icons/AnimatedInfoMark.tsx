/**
 * AnimatedInfoMark Component
 *
 * SVG-based animated info mark (circle with "i" symbol) with stroke animation.
 * Uses Lucide Info's exact geometry for consistency.
 * Used as info indicator for alerts and feedback.
 */
import { useEffect, useState } from 'react';

interface AnimatedInfoMarkProps {
  size?: number;
  className?: string;
}

export function AnimatedInfoMark({ size = 48, className = '' }: AnimatedInfoMarkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Uses Lucide's 24x24 viewBox with exact Info geometry
  // Note: Lucide's "i" has dot at TOP (y=8) and line below (y=12 to y=16)

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

        {/* Info dot at top (fades in first) */}
        <circle
          cx="12"
          cy="8"
          r="1"
          fill="currentColor"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out 0.5s',
          }}
        />

        {/* Info line below dot (Lucide: M12 16v-4, draws bottom to top) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M12 16v-4"
          style={{
            strokeDasharray: '4',
            strokeDashoffset: isVisible ? '0' : '4',
            transition: 'stroke-dashoffset 0.25s cubic-bezier(0.65, 0, 0.45, 1) 0.65s',
          }}
        />
      </svg>
    </div>
  );
}
