/**
 * AnimatedWarningMark Component
 *
 * SVG-based animated warning mark (triangle with exclamation) with stroke animation.
 * Triangle draws sequentially clockwise from apex, then exclamation appears.
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

  // Triangle vertices (expanded for breathing room around !):
  // top (26, 4), bottom-right (48, 46), bottom-left (4, 46)
  // Side lengths: diagonals ≈ 47, bottom = 44

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 52 52">
        {/* Triangle side 1: top to bottom-right (clockwise from apex) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M26 4 L48 46"
          style={{
            strokeDasharray: '48',
            strokeDashoffset: isVisible ? '0' : '48',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1)',
          }}
        />

        {/* Triangle side 2: bottom-right to bottom-left */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M48 46 L4 46"
          style={{
            strokeDasharray: '44',
            strokeDashoffset: isVisible ? '0' : '44',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.25s',
          }}
        />

        {/* Triangle side 3: bottom-left back to top */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 46 L26 4"
          style={{
            strokeDasharray: '48',
            strokeDashoffset: isVisible ? '0' : '48',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />

        {/* Exclamation line (draws top to bottom) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          d="M26 18 L26 30"
          style={{
            strokeDasharray: '14',
            strokeDashoffset: isVisible ? '0' : '14',
            transition: 'stroke-dashoffset 0.25s cubic-bezier(0.65, 0, 0.45, 1) 0.7s',
          }}
        />

        {/* Exclamation dot (fades in) */}
        <circle
          cx="26"
          cy="38"
          r="3.5"
          fill="currentColor"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out 0.9s',
          }}
        />
      </svg>
    </div>
  );
}
