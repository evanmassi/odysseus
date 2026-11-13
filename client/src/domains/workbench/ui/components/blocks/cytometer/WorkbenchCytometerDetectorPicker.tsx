import { Select, type SelectOption } from '@shared/ui';

interface WorkbenchCytometerDetectorPickerProps {
  value: string | null;
  placeholder?: string;
  options: SelectOption[];
  label: string;
  onPick: (detectorId: string) => void;
}

export function WorkbenchCytometerDetectorPicker({
  value,
  placeholder,
  options,
  label,
  onPick,
}: WorkbenchCytometerDetectorPickerProps) {
  return (
    <span className="inline-block w-[4.5rem]">
      <Select
        size="xs"
        isQuiet
        value={value}
        placeholder={placeholder}
        options={options}
        aria-label={label}
        renderValue={([picked]) => (
          <span className="font-semibold text-foreground">{picked?.value}</span>
        )}
        onChange={detectorId => onPick(String(detectorId))}
      />
    </span>
  );
}
