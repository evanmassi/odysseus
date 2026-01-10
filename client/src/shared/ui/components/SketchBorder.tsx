import { useEffect, useRef, useState } from 'react';

interface SketchBorderProps {
  width: number;
  height: number;
  borderRadius?: number;
  strokeWidth?: number;
  strokeColor?: string;
  isClosing?: boolean;
  className?: string;
}

/**
 * SVG border that animates drawing itself using stroke-dashoffset.
 * Used for auth modals to create a "sketch" effect.
 */
export function SketchBorder({
  width,
  height,
  borderRadius = 16,
  strokeWidth = 2,
  strokeColor = 'currentColor',
  isClosing = false,
  className = '',
}: SketchBorderProps) {
  const pathRef = useRef<SVGRectElement>(null);
  // Initialize with calculated estimate to prevent flash of borderLength=0
  // Formula: perimeter of rounded rect = 2*(w + h) - 8*r + 2*PI*r
  const [borderLength, setBorderLength] = useState(
    () => 2 * (width + height - strokeWidth) - 8 * borderRadius + 2 * Math.PI * borderRadius
  );

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setBorderLength(length);
    }
  }, [width, height, borderRadius]);

  const animationClass = isClosing ? 'animate-sketch-border-out' : 'animate-sketch-border-in';

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      style={
        {
          '--border-length': borderLength,
        } as React.CSSProperties
      }
    >
      <rect
        ref={pathRef}
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={borderRadius}
        ry={borderRadius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={animationClass}
      />
    </svg>
  );
}
