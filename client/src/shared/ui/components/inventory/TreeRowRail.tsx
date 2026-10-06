import type { ReactNode } from 'react';

import { PLAIN_SECTION_RULE } from '../../primitives/titles/SectionHeader';

interface TreeRowRailProps {
  count: number;
  countNoun: [string, string];
  tools?: ReactNode;
  isSubtle?: boolean;
}

export function TreeRowRail({ count, countNoun, tools, isSubtle = false }: TreeRowRailProps) {
  const [singular, plural] = countNoun;
  return (
    <>
      <span className="nav-tree-row__rail">
        <span
          aria-hidden
          className={`h-px min-w-6 flex-1 ${PLAIN_SECTION_RULE} ${isSubtle ? 'opacity-60' : ''}`}
        />
        {tools && (
          <span className="row-tools">
            <span className="min-w-0 overflow-hidden">
              <span
                className="flex items-center gap-1 pl-2.5"
                role="presentation"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              >
                {tools}
              </span>
            </span>
          </span>
        )}
      </span>
      <span className="nav-tree-row__count whitespace-nowrap font-mono text-data-sm tracking-[0.04em]">
        {count} <span className="text-muted-foreground/60">{count === 1 ? singular : plural}</span>
      </span>
    </>
  );
}
