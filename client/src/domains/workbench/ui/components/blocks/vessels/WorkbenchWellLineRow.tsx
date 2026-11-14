import { useState } from 'react';
import type { Ref } from 'react';

import { plateValueKey, type PlateLine } from '@odysseus/shared-schemas';
import { X } from 'lucide-react';

import { Input, Select, Tooltip } from '@shared/ui';

import { withGreekLetters } from '../../../../utils/materials/greekLetters';
import { WorkbenchValueAmountField } from '../values/WorkbenchValueAmountField';

import { WorkbenchColorSwatchList } from './WorkbenchColorSwatchList';
import { WorkbenchPlateNameField } from './WorkbenchPlateNameField';

import type { ShownRole } from '../../../../utils/vessels/plateLayers';
import type { NameElsewhere, WellRow } from '../../../../utils/vessels/wellEdits';

interface WorkbenchWellLineRowProps {
  row: WellRow;
  textPlaceholder: string;
  seriesText: string | undefined;
  autoRole: ShownRole | undefined;
  showsRole: boolean;
  canRemove: boolean;
  inputRef: Ref<HTMLInputElement> | undefined;
  sharedName: NameElsewhere | undefined;
  onTextChange: (text: string) => void;
  onRenameEverywhere: () => void;
  onRenameLine: (name: string) => void;
  onAmountChange: (amount: string) => void;
  onUnitChange: (unit: string) => void;
  onRoleChange: (role: PlateLine['role']) => void;
  onRemove: () => void;
  onOpenSeries: () => void;
  onPickColor: (color: string) => void;
}

const ROLE_LABELS: Readonly<Record<PlateLine['role'], string>> = {
  auto: 'Auto',
  color: 'Color',
  band: 'Band',
  caption: 'Caption',
  hover: 'Hover only',
};
const SUGGESTION_LIMIT = 6;

export function WorkbenchWellLineRow({
  row,
  textPlaceholder,
  seriesText,
  autoRole,
  showsRole,
  canRemove,
  inputRef,
  sharedName,
  onTextChange,
  onRenameEverywhere,
  onRenameLine,
  onAmountChange,
  onUnitChange,
  onRoleChange,
  onRemove,
  onOpenSeries,
  onPickColor,
}: WorkbenchWellLineRowProps) {
  const [isPickingColor, setIsPickingColor] = useState(false);
  const typed = plateValueKey(row.text);
  const suggestions = typed
    ? (row.line?.values ?? [])
        .filter(value => {
          const key = plateValueKey(value.text);
          return key.includes(typed) && key !== typed;
        })
        .slice(0, SUGGESTION_LIMIT)
    : [];
  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label: value === 'auto' && autoRole ? `Auto: ${ROLE_LABELS[autoRole].toLowerCase()}` : label,
  }));

  return (
    <div className="flex flex-col gap-1">
      {row.line && (
        <span className="pl-6">
          <WorkbenchPlateNameField
            name={row.line.name}
            shown={row.line.name || <span className="italic">Name this line</span>}
            label="Line name"
            placeholder="Name this line"
            className="text-label-xs text-muted-foreground"
            onRename={onRenameLine}
          />
        </span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!row.value}
          aria-label={
            row.value ? `Change the color of ${row.value.text}` : 'Name it to pick a color'
          }
          aria-expanded={isPickingColor}
          className="h-4 w-4 flex-none border border-foreground/30 disabled:opacity-30"
          style={{ backgroundColor: row.value?.color }}
          onClick={() => setIsPickingColor(!isPickingColor)}
        />
        <span className="min-w-0 flex-1">
          <Input
            ref={inputRef}
            size="sm"
            fullWidth
            value={row.text}
            placeholder={row.isTextMixed ? 'Mixed. Typing replaces all' : textPlaceholder}
            aria-label="What is in these wells"
            spellCheck={false}
            autoComplete="off"
            onValueChange={onTextChange}
            onBlur={event => {
              const typed = event.currentTarget.value;
              const converted = withGreekLetters(typed);
              if (converted !== typed) onTextChange(converted);
            }}
          />
        </span>
        {seriesText ? (
          <Tooltip content="Change this dilution">
            <button
              type="button"
              className="whitespace-nowrap border border-line-soft px-2 py-1 font-mono text-data-sm text-foreground hover:border-primary/60"
              onClick={onOpenSeries}
            >
              {seriesText}
            </button>
          </Tooltip>
        ) : (
          <>
            <WorkbenchValueAmountField
              value={row.amount}
              unit={row.unit}
              units={undefined}
              isInvalid={false}
              placeholder={row.isAmountMixed ? 'Mixed' : 'Amount'}
              isFocusedOnMount={false}
              onValueChange={onAmountChange}
              onUnitChange={onUnitChange}
            />
            <Tooltip content="Fill these wells with a dilution or any stepped series">
              <button
                type="button"
                className="text-caption text-primary hover:underline"
                onClick={onOpenSeries}
              >
                Dilution
              </button>
            </Tooltip>
          </>
        )}
        {showsRole && row.line && (
          <Select
            size="xs"
            isQuiet
            options={roleOptions}
            value={row.line.role}
            aria-label="How this line shows on the plate"
            onChange={next => onRoleChange(String(next) as PlateLine['role'])}
            className="w-32"
          />
        )}
        {canRemove && (
          <button
            type="button"
            aria-label="Remove this line from these wells"
            className="inline-flex h-6 w-6 flex-none items-center justify-center text-muted-foreground hover:text-danger-text"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {sharedName && (
        <p className="pl-6 text-caption text-muted-foreground">
          {sharedName.text} is also on {sharedName.wellCount}{' '}
          {sharedName.wellCount === 1 ? 'well' : 'wells'}
          {sharedName.vesselName && ` on ${sharedName.vesselName}`} ·{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={onRenameEverywhere}
          >
            Rename everywhere
          </button>
        </p>
      )}
      {isPickingColor && row.value && (
        <WorkbenchColorSwatchList
          current={row.value.color}
          onPick={color => {
            onPickColor(color);
            setIsPickingColor(false);
          }}
        />
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map(value => (
            <button
              key={value.id}
              type="button"
              className="border border-line-soft px-2 py-0.5 text-caption text-foreground hover:border-primary/60"
              onClick={() => onTextChange(value.text)}
            >
              {value.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
