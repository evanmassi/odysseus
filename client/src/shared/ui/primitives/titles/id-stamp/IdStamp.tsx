/**
 * Id Stamp
 *
 * Mono metadata strip with `//` separators between parts.
 */

import React from 'react';

export interface IdStampProps {
  parts: React.ReactNode[];
  className?: string;
}

export function IdStamp({ parts, className }: IdStampProps) {
  return (
    <span
      className={`font-mono text-data-sm tracking-meta text-muted-foreground ${className ?? ''}`}
    >
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="px-1.5 text-muted-foreground/40">{'//'}</span>}
          {part}
        </React.Fragment>
      ))}
    </span>
  );
}
