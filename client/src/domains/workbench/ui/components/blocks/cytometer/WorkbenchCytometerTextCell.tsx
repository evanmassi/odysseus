import { withGreekLetters } from '../../../../utils/materials/greekLetters';

import { CYTOMETER_FIELD } from './cytometerTableStyles';

interface WorkbenchCytometerTextCellProps {
  value: string;
  label: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

export function WorkbenchCytometerTextCell({
  value,
  label,
  placeholder,
  className = '',
  onChange,
}: WorkbenchCytometerTextCellProps) {
  return (
    <span className="inline-edit">
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        className={`${CYTOMETER_FIELD} w-28 ${className}`}
        onChange={event => onChange(event.target.value)}
        onBlur={() => {
          const finished = withGreekLetters(value);
          if (finished !== value) onChange(finished);
        }}
      />
    </span>
  );
}
