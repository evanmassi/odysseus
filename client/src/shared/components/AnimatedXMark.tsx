/**
 * AnimatedXMark Component
 *
 * SVG-based animated X mark with circle stroke animation.
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
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 52 52">
        {/* Circle */}
        <circle
          cx="26"
          cy="26"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          style={{
            strokeDasharray: '151',
            strokeDashoffset: isVisible ? '0' : '151',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1)',
          }}
        />

        {/* X Line 1: top-left to bottom-right */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          d="M17 17 L35 35"
          style={{
            strokeDasharray: '29',
            strokeDashoffset: isVisible ? '0' : '29',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
          }}
        />

        {/* X Line 2: top-right to bottom-left */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          d="M35 17 L17 35"
          style={{
            strokeDasharray: '29',
            strokeDashoffset: isVisible ? '0' : '29',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.7s',
          }}
        />
      </svg>
    </div>
  );
}
