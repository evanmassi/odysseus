import { useMemo, useState } from 'react';

import { Autocomplete } from '@shared/ui';

import { useFluorCatalog } from '../../../hooks/useFluorCatalog';
import { useFluorAddStore } from '../../../stores/fluorAddStore';
import { useMaterialMemoryStore } from '../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { keepFluorInFile } from '../../../utils/fluors/fileFluors';
import { conjugatePicks, resolveFluor } from '../../../utils/fluors/fluorPicks';

interface WorkbenchConjugateFieldProps {
  value: string;
  label: string;
  includesOtherConjugates: boolean;
  inputClassName: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const PICK_ALL = 0;

export function WorkbenchConjugateField({
  value,
  label,
  includesOtherConjugates,
  inputClassName,
  placeholder,
  onChange,
}: WorkbenchConjugateFieldProps) {
  const catalog = useFluorCatalog();
  const memoryFluors = useMaterialMemoryStore(state => state.memory.fluors);
  const remembered = useMemo(() => Object.values(memoryFluors), [memoryFluors]);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const askToAdd = useFluorAddStore(state => state.askToAdd);
  const [typed, setTyped] = useState<string>();

  const picks = useMemo(
    () => conjugatePicks(catalog, remembered, typed ?? '', { includesOtherConjugates }),
    [catalog, remembered, typed, includesOtherConjugates]
  );
  const options = useMemo(
    () =>
      picks.map(pick => ({
        value: pick.name,
        label: pick.isNew ? `Add "${pick.name}" as a new fluor…` : pick.name,
        secondary: pick.peak === undefined ? undefined : `${pick.peak} nm`,
        group: pick.group,
      })),
    [picks]
  );

  const settle = (text: string) => {
    setTyped(undefined);
    const { name, toKeep } = resolveFluor(catalog, remembered, text);
    if (toKeep) updateProtocol(draft => keepFluorInFile(draft, toKeep));
    if (name !== text) onChange(name);
  };

  return (
    <Autocomplete
      value={value}
      options={options}
      minChars={PICK_ALL}
      aria-label={label}
      placeholder={placeholder}
      inputClassName={inputClassName}
      onChange={text => {
        setTyped(text);
        onChange(text);
      }}
      onSelect={option => {
        const pick = picks.find(candidate => candidate.name === option.value);
        if (pick?.isNew) {
          setTyped(undefined);
          askToAdd(pick.name, onChange);
        } else settle(option.value);
      }}
      onBlur={() => settle(value)}
    />
  );
}
