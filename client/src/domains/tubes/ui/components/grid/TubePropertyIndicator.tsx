/**
 * Tube Property Indicator
 *
 * SVG-based shape indicators (square/triangle) with pattern overlays for lot and condition coding.
 */
import React, { memo } from 'react';

type IndicatorShape = 'square' | 'triangle';
type IndicatorPattern =
  | 'solid'
  | 'stripe'
  | 'dot'
  | 'cross'
  | 'checkered'
  | 'circle'
  | 'double-stripe'
  | 'diamond';

interface TubePropertyIndicatorProps {
  shape: IndicatorShape;
  color: string;
  pattern: IndicatorPattern;
  size: number;
  title?: string;
  className?: string;
}

// Stroke color based on fill color (white/yellow get dark stroke, others get white)
function getStrokeColor(fillColor: string): string {
  const lightColors = ['#FFFF00', '#FFFFFF', '#F0F0F0', '#FFFFFFFF'];
  return lightColors.some(c => fillColor.toUpperCase().startsWith(c.slice(0, 7)))
    ? '#000000'
    : '#FFFFFF';
}

// Pattern color (inverse of stroke for visibility)
function getPatternColor(fillColor: string): string {
  return getStrokeColor(fillColor);
}

function renderPattern(
  pattern: IndicatorPattern,
  patternColor: string,
  viewBoxSize: number
): React.ReactNode {
  const center = viewBoxSize / 2;
  const strokeWidth = 2;

  switch (pattern) {
    case 'solid':
      return null;

    case 'stripe':
      return (
        <line
          x1={center}
          y1={2}
          x2={center}
          y2={viewBoxSize - 2}
          stroke={patternColor}
          strokeWidth={strokeWidth}
        />
      );

    case 'dot':
      return <circle cx={center} cy={center} r={3} fill={patternColor} />;

    case 'cross':
      return (
        <>
          <line
            x1={4}
            y1={center}
            x2={viewBoxSize - 4}
            y2={center}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={center}
            y1={4}
            x2={center}
            y2={viewBoxSize - 4}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
        </>
      );

    case 'checkered':
      return (
        <>
          <rect x={0} y={0} width={center} height={center} fill={patternColor} opacity={0.8} />
          <rect
            x={center}
            y={center}
            width={center}
            height={center}
            fill={patternColor}
            opacity={0.8}
          />
        </>
      );

    case 'circle':
      return (
        <circle cx={center} cy={center} r={4} fill="none" stroke={patternColor} strokeWidth={1.5} />
      );

    case 'double-stripe':
      return (
        <>
          <line
            x1={center - 3}
            y1={2}
            x2={center - 3}
            y2={viewBoxSize - 2}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={center + 3}
            y1={2}
            x2={center + 3}
            y2={viewBoxSize - 2}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
        </>
      );

    case 'diamond':
      return (
        <rect
          x={center - 3}
          y={center - 3}
          width={6}
          height={6}
          fill={patternColor}
          transform={`rotate(45 ${center} ${center})`}
        />
      );

    default:
      return null;
  }
}

function renderTrianglePattern(
  pattern: IndicatorPattern,
  patternColor: string,
  viewBoxSize: number
): React.ReactNode {
  const center = viewBoxSize / 2;
  // Triangle center is lower than geometric center due to shape
  const triangleCenterY = viewBoxSize * 0.65;
  const strokeWidth = 2;

  switch (pattern) {
    case 'solid':
      return null;

    case 'stripe':
      return (
        <line
          x1={center}
          y1={viewBoxSize * 0.35}
          x2={center}
          y2={viewBoxSize - 2}
          stroke={patternColor}
          strokeWidth={strokeWidth}
        />
      );

    case 'dot':
      return <circle cx={center} cy={triangleCenterY} r={2.5} fill={patternColor} />;

    case 'cross':
      return (
        <>
          <line
            x1={center - 4}
            y1={triangleCenterY}
            x2={center + 4}
            y2={triangleCenterY}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={center}
            y1={triangleCenterY - 4}
            x2={center}
            y2={triangleCenterY + 4}
            stroke={patternColor}
            strokeWidth={strokeWidth}
          />
        </>
      );

    case 'circle':
      return (
        <circle
          cx={center}
          cy={triangleCenterY}
          r={3}
          fill="none"
          stroke={patternColor}
          strokeWidth={1.5}
        />
      );

    case 'diamond':
      return (
        <rect
          x={center - 2.5}
          y={triangleCenterY - 2.5}
          width={5}
          height={5}
          fill={patternColor}
          transform={`rotate(45 ${center} ${triangleCenterY})`}
        />
      );

    // Checkered and double-stripe don't work well in triangles - fall back to dot
    case 'checkered':
    case 'double-stripe':
      return <circle cx={center} cy={triangleCenterY} r={2.5} fill={patternColor} />;

    default:
      return null;
  }
}

export const TubePropertyIndicator = memo<TubePropertyIndicatorProps>(
  ({ shape, color, pattern, size, title, className }) => {
    const viewBoxSize = 16;
    const strokeColor = getStrokeColor(color);
    const patternColor = getPatternColor(color);
    const strokeWidth = 1.25;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className={className}
        role="img"
        aria-label={title}
      >
        {title && <title>{title}</title>}

        {shape === 'square' ? (
          <>
            <rect
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={viewBoxSize - strokeWidth}
              height={viewBoxSize - strokeWidth}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              rx={1}
            />
            {renderPattern(pattern, patternColor, viewBoxSize)}
          </>
        ) : (
          <>
            {/* Triangle background (pointing up) */}
            <polygon
              points={`${viewBoxSize / 2},${strokeWidth} ${viewBoxSize - strokeWidth},${viewBoxSize - strokeWidth} ${strokeWidth},${viewBoxSize - strokeWidth}`}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            {renderTrianglePattern(pattern, patternColor, viewBoxSize)}
          </>
        )}
      </svg>
    );
  }
);

TubePropertyIndicator.displayName = 'TubePropertyIndicator';
