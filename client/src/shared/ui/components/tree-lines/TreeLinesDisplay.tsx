import { useState, useEffect } from 'react';

import type { TreeLine, TreeNodeTone } from './useTreeLines';

interface TreeLinesDisplayProps {
  lines: TreeLine[];
}

interface TreeNode {
  id: string;
  x: number;
  y: number;
  tone: TreeNodeTone;
}

const NODE_SIZE = 3;

function collectNodes(lines: TreeLine[]): TreeNode[] {
  return lines.flatMap(line => {
    const nodes: TreeNode[] = [];
    if (line.startNode) {
      nodes.push({ id: `${line.id}-start`, x: line.x1, y: line.y1, tone: line.startNode });
    }
    if (line.endNode) {
      nodes.push({ id: `${line.id}-end`, x: line.x2, y: line.y2, tone: line.endNode });
    }
    return nodes;
  });
}

export function TreeLinesDisplay({ lines }: TreeLinesDisplayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lines.length > 0 && !visible) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [lines, visible]);

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
        zIndex: 11,
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <style>
        {`
          .tree-line {
            stroke: var(--storage-nav-text-muted, #cbd5e1);
          }
          .tree-node {
            fill: hsl(var(--primary));
            filter: drop-shadow(0 0 3px hsl(var(--primary) / calc(0.85 * var(--lit))));
          }
          .tree-node--full {
            fill: hsl(var(--color-danger-bg));
            filter: drop-shadow(0 0 3px hsl(var(--color-danger-bg) / calc(0.85 * var(--lit))));
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

      {collectNodes(lines).map(node => (
        <rect
          key={node.id}
          x={node.x - NODE_SIZE / 2}
          y={node.y - NODE_SIZE / 2}
          width={NODE_SIZE}
          height={NODE_SIZE}
          className={node.tone === 'full' ? 'tree-node tree-node--full' : 'tree-node'}
        />
      ))}
    </svg>
  );
}
