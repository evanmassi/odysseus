import { Fragment } from 'react';

interface RowMetaProps {
  parts: Array<string | number>;
}

export function RowMeta({ parts }: RowMetaProps) {
  return (
    <span className="flex flex-shrink-0 items-center gap-1.5 font-mono text-data-sm tracking-[0.04em] text-foreground/45">
      {parts.map((part, index) => (
        <Fragment key={index}>
          <span aria-hidden className="text-foreground/25">
            ·
          </span>
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}
