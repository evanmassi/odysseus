/**
 * AnimatedInfoMark Component
 *
 * SVG-based animated info mark (circle with exclamation) with stroke animation.
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

        {/* Exclamation line (draws top to bottom) */}
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          d="M26 14 L26 30"
          style={{
            strokeDasharray: '17',
            strokeDashoffset: isVisible ? '0' : '17',
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s',
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
            transition: 'opacity 0.2s ease-in-out 0.75s',
          }}
        />
      </svg>
    </div>
  );
}
