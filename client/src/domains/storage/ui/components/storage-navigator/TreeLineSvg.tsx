import type { TreeLine } from './useTreeLines';

interface TreeLineSvgProps {
  lines: TreeLine[];
}

export function TreeLineSvg({ lines }: TreeLineSvgProps) {
  if (lines.length === 0) return null;

  return (
    <svg
      className="tree-line-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <style>
        {`
          .tree-line {
            stroke: var(--storage-nav-text-muted, #cbd5e1);
          }
        `}
      </style>

      {lines.map(line => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          strokeWidth={line.strokeWidth}
          opacity={0.6}
          className="tree-line"
        />
      ))}
    </svg>
  );
}
