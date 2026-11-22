import { withGreekLetters } from '@odysseus/shared-schemas';

import { FLOW_CYTOMETRY_FIELD } from './flowCytometryTableStyles';

interface WorkbenchFlowCytometryTextCellProps {
  value: string;
  label: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

export function WorkbenchFlowCytometryTextCell({
  value,
  label,
  placeholder,
  className = '',
  onChange,
}: WorkbenchFlowCytometryTextCellProps) {
  return (
    <span className="inline-edit">
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        className={`${FLOW_CYTOMETRY_FIELD} w-24 ${className}`}
        onChange={event => onChange(event.target.value)}
        onBlur={() => {
          const finished = withGreekLetters(value);
          if (finished !== value) onChange(finished);
        }}
      />
    </span>
  );
}
