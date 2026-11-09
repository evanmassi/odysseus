import { PICK_NAME_ATTRIBUTE } from '../../tray/useTrayPickDrag';

import type { SectionNumber } from '../../../../utils/formulas/calculationSections';

interface WorkbenchFormulaBoardNumberListProps {
  numbers: readonly SectionNumber[];
}

export function WorkbenchFormulaBoardNumberList({ numbers }: WorkbenchFormulaBoardNumberListProps) {
  if (!numbers.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {numbers.map(number => (
        <button
          key={number.name}
          type="button"
          tabIndex={-1}
          className="flex flex-col items-start text-left hover:[&>b]:underline hover:[&>b]:decoration-dotted"
          {...{ [PICK_NAME_ATTRIBUTE]: number.name }}
        >
          <span className="text-label-2xs text-muted-foreground">{number.label}</span>
          <b className="font-mono text-data-sm font-normal text-foreground">{number.text}</b>
        </button>
      ))}
    </div>
  );
}
