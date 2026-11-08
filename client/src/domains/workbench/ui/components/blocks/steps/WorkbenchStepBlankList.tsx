import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { createPortal } from 'react-dom';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { describeName } from '../../../../utils/formulas/nameDisplay';

import type { BlankOption } from '../../../../utils/steps/stepPresets';

interface WorkbenchStepBlankListProps {
  anchor: HTMLElement;
  options: readonly BlankOption[];
  activeIndex: number;
  onPick: (option: BlankOption) => void;
}

const LIST_GAP_PX = 4;
const MIN_WIDTH_PX = 180;

export function WorkbenchStepBlankList({
  anchor,
  options,
  activeIndex,
  onPick,
}: WorkbenchStepBlankListProps) {
  const calculation = useWorkbenchStore(state => state.calculation);
  const [position, setPosition] = useState<CSSProperties>();

  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      setPosition({
        left: rect.left,
        top: rect.bottom + LIST_GAP_PX,
        minWidth: Math.max(rect.width, MIN_WIDTH_PX),
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    return () => window.removeEventListener('scroll', place, true);
  }, [anchor, options]);

  return createPortal(
    <div
      role="listbox"
      tabIndex={-1}
      className="fixed z-popover max-h-48 overflow-y-auto border border-line-mid bg-card py-1 shadow-[var(--popup-shadow)]"
      style={position ?? { visibility: 'hidden' }}
      onMouseDown={event => event.preventDefault()}
    >
      {options.map((option, index) => {
        const shown = option.name ? describeName(calculation, option.name).text : option.text;
        const isActive = index === activeIndex;
        return (
          <div
            key={option.text}
            role="option"
            tabIndex={-1}
            aria-selected={isActive}
            className={`cursor-pointer whitespace-nowrap px-3 py-1.5 text-body-sm ${isActive ? 'bg-gradient-to-r from-primary/20 to-transparent text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]' : 'text-foreground/75 hover:text-foreground'}`}
            onClick={() => onPick(option)}
            onKeyDown={event => {
              if (event.key === 'Enter') onPick(option);
            }}
          >
            {option.text}
            {shown !== option.text && (
              <span className="ml-3.5 font-mono text-data-sm text-muted-foreground">{shown}</span>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
