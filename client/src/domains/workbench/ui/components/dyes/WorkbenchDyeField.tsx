import { useMemo, useState } from 'react';

import { Autocomplete } from '@shared/ui';

import { useDyeCatalog } from '../../../hooks/useDyeCatalog';
import { useDyeAddStore } from '../../../stores/dyeAddStore';
import { useMaterialMemoryStore } from '../../../stores/materialMemoryStore';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { conjugatePicks, resolveDye } from '../../../utils/dyes/dyePicks';
import { keepDyeInFile } from '../../../utils/dyes/fileDyes';

interface WorkbenchDyeFieldProps {
  value: string;
  label: string;
  includesOtherConjugates: boolean;
  inputClassName: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const PICK_ALL = 0;

export function WorkbenchDyeField({
  value,
  label,
  includesOtherConjugates,
  inputClassName,
  placeholder,
  onChange,
}: WorkbenchDyeFieldProps) {
  const catalog = useDyeCatalog();
  const memoryDyes = useMaterialMemoryStore(state => state.memory.dyes);
  const remembered = useMemo(() => Object.values(memoryDyes), [memoryDyes]);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const askToAdd = useDyeAddStore(state => state.askToAdd);
  const [typed, setTyped] = useState<string>();

  const picks = useMemo(
    () => conjugatePicks(catalog, remembered, typed ?? '', { includesOtherConjugates }),
    [catalog, remembered, typed, includesOtherConjugates]
  );
  const options = useMemo(
    () =>
      picks.map(pick => ({
        value: pick.name,
        label: pick.isNew ? `Add “${pick.name}” as a new dye…` : pick.name,
        secondary: pick.peak === undefined ? undefined : `${pick.peak} nm`,
        group: pick.group,
      })),
    [picks]
  );

  const settle = (text: string) => {
    setTyped(undefined);
    const { name, toKeep } = resolveDye(catalog, remembered, text);
    if (toKeep) updateProtocol(draft => keepDyeInFile(draft, toKeep));
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
