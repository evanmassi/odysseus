/**
 * Tube Property Indicator
 *
 * SVG-based shape indicators (square/triangle) with pattern overlays for lot and condition coding.
 */
import React, { memo } from 'react';

type IndicatorShape = 'square' | 'corner-triangle';
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
  /** Outline override; defaults to a contrast stroke against the shape's own fill. */
  strokeColor?: string;
}

// Stroke color based on fill color (white/yellow get dark stroke, others get white)
function getStrokeColor(fillColor: string): string {
  const lightColors = ['#FFFF00', '#FFFFFF', '#F0F0F0', '#FFFFFFFF'];
  return lightColors.some(c => fillColor.toUpperCase().startsWith(c.slice(0, 7)))
    ? '#000000'
    : '#FFFFFF';
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

export const TubePropertyIndicator = memo<TubePropertyIndicatorProps>(
  ({ shape, color, pattern, size, title, strokeColor }) => {
    const viewBoxSize = 16;
    const stroke = strokeColor ?? getStrokeColor(color);
    const patternColor = getStrokeColor(color);
    const strokeWidth = 1.25;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
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
              stroke={stroke}
              strokeWidth={strokeWidth}
              rx={1}
            />
            {renderPattern(pattern, patternColor, viewBoxSize)}
          </>
        ) : (
          <polygon
            points={`${viewBoxSize - strokeWidth / 2},${strokeWidth / 2} ${viewBoxSize - strokeWidth / 2},${viewBoxSize - strokeWidth / 2} ${strokeWidth / 2},${viewBoxSize - strokeWidth / 2}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )}
      </svg>
    );
  }
);

TubePropertyIndicator.displayName = 'TubePropertyIndicator';
