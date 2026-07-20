/**
 * Animated X Mark Icon
 *
 * SVG-based animated X mark using Lucide OctagonX's exact geometry.
 */

import { useRevealOnMount } from './useRevealOnMount';

interface AnimatedXMarkProps {
  size?: number;
  className?: string;
}

export function AnimatedXMark({ size = 48, className = '' }: AnimatedXMarkProps) {
  const isVisible = useRevealOnMount();

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Octagon */}
        <path
          d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
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

        {/* X Line 1: top-right to bottom-left */}
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

        {/* X Line 2: top-left to bottom-right */}
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
