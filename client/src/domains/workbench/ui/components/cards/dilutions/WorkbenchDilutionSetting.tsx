import type { ReactNode } from 'react';

import { Input, Tooltip } from '@shared/ui';

import { termMeaning } from '../../../../utils/terms/termLookup';
import { META_LABEL } from '../../board/metaLabelClass';

interface WorkbenchDilutionSettingProps {
  label: string;
  unit?: string;
  children: ReactNode;
}

interface WorkbenchDilutionSettingInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function WorkbenchDilutionSettingLabel({ label }: { label: string }) {
  const meaning = termMeaning(label);
  const text = <span className={META_LABEL}>{label}</span>;
  return meaning ? <Tooltip content={meaning}>{text}</Tooltip> : text;
}

export function WorkbenchDilutionSetting({ label, unit, children }: WorkbenchDilutionSettingProps) {
  return (
    <div className="flex flex-col gap-1">
      <WorkbenchDilutionSettingLabel label={label} />
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        {children}
        {unit}
      </span>
    </div>
  );
}

export function WorkbenchDilutionSettingInput({
  label,
  value,
  placeholder,
  onChange,
}: WorkbenchDilutionSettingInputProps) {
  return (
    <span className="w-16">
      <Input
        size="xs"
        fullWidth
        value={value}
        placeholder={placeholder}
        aria-label={label}
        inputClassName="text-right font-mono"
        onValueChange={onChange}
      />
    </span>
  );
}
