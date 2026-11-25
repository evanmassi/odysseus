import { Fragment, useRef, useState } from 'react';

import { Plus, Trash2, type LucideIcon } from 'lucide-react';

import { DropdownMenu } from '@shared/ui';

import { RAIL_HEADING } from './cardRailStyles';
import { WorkbenchCardRailItem } from './WorkbenchCardRailItem';

export interface RailShownEntry {
  id: string;
  label: string;
  hint: string;
}

export interface RailShownSection {
  id: string;
  heading: string;
  entries: RailShownEntry[];
  canRemove: boolean;
}

interface WorkbenchCardRailShowMenuProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  menuLabel: string;
  newLabel: string;
  newHint: string;
  sections: readonly RailShownSection[];
  onNew: (railItem: HTMLButtonElement | undefined) => void;
  onShow: (id: string, railItem: HTMLButtonElement | undefined) => void;
  onRemove: (entry: RailShownEntry) => void;
}

const MENU_GAP = 8;
const MENU_HEADING = `${RAIL_HEADING} block pt-3`;

export function WorkbenchCardRailShowMenu({
  icon,
  label,
  hint,
  menuLabel,
  newLabel,
  newHint,
  sections,
  onNew,
  onShow,
  onRemove,
}: WorkbenchCardRailShowMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const railItemRef = useRef<HTMLButtonElement>();
  const [isOpen, setIsOpen] = useState(false);
  const [openAt, setOpenAt] = useState<{ top: number; left: number }>();
  const close = () => setIsOpen(false);

  const toggle = (railItem: HTMLButtonElement) => {
    if (isOpen) return close();
    railItemRef.current = railItem;
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (anchor) setOpenAt({ top: anchor.top, left: anchor.right + MENU_GAP });
    setIsOpen(true);
  };

  return (
    <div ref={anchorRef} className="relative">
      <WorkbenchCardRailItem
        icon={icon}
        label={label}
        hint={hint}
        isExpanded={isOpen}
        onPick={toggle}
      />
      <DropdownMenu
        isOpen={isOpen}
        onClose={close}
        triggerRef={anchorRef}
        portal
        motion="slide-right"
        aria-label={menuLabel}
        className="min-w-[200px] max-w-sm py-1"
        style={openAt}
      >
        <WorkbenchCardRailItem
          icon={Plus}
          label={newLabel}
          hint={newHint}
          isMenuItem
          onPick={() => {
            close();
            onNew(railItemRef.current);
          }}
        />
        {sections.map(section => (
          <Fragment key={section.id}>
            <span className={MENU_HEADING}>{section.heading}</span>
            {section.entries.map(entry => (
              <div key={entry.id} className="group relative">
                <WorkbenchCardRailItem
                  icon={icon}
                  label={entry.label}
                  hint={entry.hint}
                  isMenuItem
                  onPick={() => {
                    close();
                    onShow(entry.id, railItemRef.current);
                  }}
                />
                {section.canRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${entry.label}`}
                    className="absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-danger-text focus-visible:inline-flex group-hover:inline-flex"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      close();
                      onRemove(entry);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </Fragment>
        ))}
      </DropdownMenu>
    </div>
  );
}
