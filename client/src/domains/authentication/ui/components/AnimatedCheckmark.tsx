/**
 * AnimatedCheckmark Component
 *
 * SVG-based animated checkmark with circle stroke animation.
 * Professional success indicator for form submissions.
 */
import { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

export function AnimatedCheckmark({ size = 48, className = '' }: AnimatedCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        className="animate-checkmark"
      >
        {/* Circle */}
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          className={`checkmark-circle ${isVisible ? 'animate' : ''}`}
          style={{
            strokeDasharray: '151',
            strokeDashoffset: isVisible ? '0' : '151',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1)',
          }}
        />

        {/* Checkmark */}
        <path
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
          className={`checkmark-check ${isVisible ? 'animate' : ''}`}
          style={{
            strokeDasharray: '48',
            strokeDashoffset: isVisible ? '0' : '48',
            transition: 'stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.4s',
          }}
        />
      </svg>
    </div>
  );
}
