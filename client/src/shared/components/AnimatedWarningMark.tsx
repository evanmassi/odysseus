/**
 * AnimatedWarningMark Component
 *
 * SVG-based animated warning mark (triangle with exclamation) with stroke animation.
 * Uses Lucide AlertTriangle's exact path geometry for proper rounded corners.
 * Used as warning indicator for alerts and feedback.
 */
import { useEffect, useState } from 'react';

interface AnimatedWarningMarkProps {
  size?: number;
  className?: string;
}

export function AnimatedWarningMark({ size = 48, className = '' }: AnimatedWarningMarkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Uses Lucide's 24x24 viewBox with exact AlertTriangle path (has arc commands for rounded corners)
  // pathLength="100" normalizes the path for easier dash animation

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Triangle (exact Lucide AlertTriangle path with rounded corners) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
          style={{
            strokeDasharray: '100',
            strokeDashoffset: isVisible ? '0' : '100',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1)',
          }}
        />

        {/* Exclamation line (Lucide's exact position) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M12 9v4"
          style={{
            strokeDasharray: '4',
            strokeDashoffset: isVisible ? '0' : '4',
            transition: 'stroke-dashoffset 0.25s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />

        {/* Exclamation dot (fades in) */}
        <circle
          cx="12"
          cy="17"
          r="1"
          fill="currentColor"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out 0.7s',
          }}
        />
      </svg>
    </div>
  );
}
