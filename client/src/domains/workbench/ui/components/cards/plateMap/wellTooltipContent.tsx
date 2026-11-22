import type { ReactNode } from 'react';

export function wellTooltipContent([heading, ...details]: readonly string[]): ReactNode {
  return (
    <div className="flex flex-col gap-0.5">
      <b className="text-foreground">{heading}</b>
      {details.map((detail, index) => (
        <span key={`${index}:${detail}`}>{detail}</span>
      ))}
    </div>
  );
}
