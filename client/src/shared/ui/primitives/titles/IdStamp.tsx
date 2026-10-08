import { Fragment } from 'react';
import type { ReactNode } from 'react';

interface IdStampProps {
  parts: ReactNode[];
  className?: string;
}

export function IdStamp({ parts, className }: IdStampProps) {
  return (
    <span
      className={`font-mono text-data-sm tracking-meta text-muted-foreground ${className ?? ''}`}
    >
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="px-2 text-muted-foreground/55">·</span>}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
