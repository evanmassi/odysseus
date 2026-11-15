import {
  Autocomplete,
  INPUT_WELL_BASE,
  INPUT_WELL_BORDER_DEFAULT,
  type AutocompleteOption,
} from '@shared/ui';

import { META_LABEL } from '../../board/metaLabelClass';

interface WorkbenchDilutionDiluentFieldProps {
  value: string;
  placeholder: string;
  choices: readonly AutocompleteOption[];
  onChange: (diluent: string) => void;
  onDone: () => void;
}

const DILUENT_INPUT = `w-full h-7 px-2 text-body-sm ${INPUT_WELL_BASE} ${INPUT_WELL_BORDER_DEFAULT}`;

const matchingChoices = (choices: readonly AutocompleteOption[], typed: string) => {
  const query = typed.trim().toLowerCase();
  return choices.filter(choice => {
    const names = [choice.label, choice.secondary].flatMap(name =>
      name ? [name.toLowerCase()] : []
    );
    return names.some(name => name.includes(query)) && !names.includes(query);
  });
};

export function WorkbenchDilutionDiluentField({
  value,
  placeholder,
  choices,
  onChange,
  onDone,
}: WorkbenchDilutionDiluentFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className={META_LABEL}>Diluent</span>
      <span className="w-44">
        <Autocomplete
          value={value}
          options={matchingChoices(choices, value)}
          minChars={0}
          fullWidth
          placeholder={placeholder}
          aria-label="Diluent"
          inputClassName={DILUENT_INPUT}
          onChange={onChange}
          onSelect={option => onChange(option.value)}
          onBlur={onDone}
        />
      </span>
    </div>
  );
}
