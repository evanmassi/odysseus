import type { ReactNode } from 'react';

import { WorkbenchValueAddField } from './WorkbenchValueAddField';

interface WorkbenchValueSectionProps {
  title: ReactNode;
  takenNames: ReadonlySet<string>;
  onAddLines: (lines: string[]) => void;
  children: ReactNode;
}

export function WorkbenchValueSection({
  title,
  takenNames,
  onAddLines,
  children,
}: WorkbenchValueSectionProps) {
  return (
    <section className="min-w-0 max-w-md">
      {title && (
        <header className="px-2 pb-1.5">
          <span className="min-w-0 truncate type-label text-label-md font-semibold text-foreground">
            {title}
          </span>
        </header>
      )}
      <table className="w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
      <div className="px-2 pt-1">
        <WorkbenchValueAddField
          ownerName=""
          placeholder="Add: Incubation 24 h"
          takenNames={takenNames}
          onAddLines={onAddLines}
        />
      </div>
    </section>
  );
}
