import { useRef, useState, type ReactNode } from 'react';

import { normalizeMaterialKey, withGreekLetters } from '@odysseus/shared-schemas';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';

import { WorkbenchPlateSuggestionList } from './WorkbenchPlateSuggestionList';

interface WorkbenchPlateNameFieldProps {
  name: string;
  shown: ReactNode;
  label: string;
  placeholder?: string;
  className: string;
  offers?: readonly string[];
  offersLabel?: string;
  onRename: (name: string) => void;
}

const MIN_FIELD_CH = 14;
const FIELD_ROOM_CH = 4;
const OFFER_LIMIT = 6;

export function WorkbenchPlateNameField({
  name,
  shown,
  label,
  placeholder,
  className,
  offers = [],
  offersLabel,
  onRename,
}: WorkbenchPlateNameFieldProps) {
  const [typed, setTyped] = useState<string>();
  const isFinishedRef = useRef(false);

  const finish = (text: string) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setTyped(undefined);
    const next = withGreekLetters(text.trim());
    if (next !== name) onRename(next);
  };

  const cancel = () => {
    isFinishedRef.current = true;
    setTyped(undefined);
  };

  if (typed === undefined) {
    return (
      <button
        type="button"
        className={`inline-edit text-left ${className}`}
        onClick={() => {
          isFinishedRef.current = false;
          setTyped(name);
        }}
      >
        {shown}
      </button>
    );
  }

  const field = (
    <input
      ref={focusOnMount}
      value={typed}
      aria-label={label}
      placeholder={placeholder}
      spellCheck={false}
      className="inline-edit-field max-w-none text-body-sm text-foreground"
      style={{ width: `${Math.max(MIN_FIELD_CH, name.length + FIELD_ROOM_CH)}ch` }}
      onChange={event => setTyped(event.currentTarget.value)}
      onBlur={event => finish(event.currentTarget.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') cancel();
      }}
    />
  );
  if (!offers.length) return field;

  const typedKey = typed === name ? '' : normalizeMaterialKey(typed);
  const matching = offers
    .filter(offer => normalizeMaterialKey(offer).includes(typedKey))
    .slice(0, OFFER_LIMIT);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {field}
      <WorkbenchPlateSuggestionList
        label={offersLabel}
        suggestions={matching.map(offer => ({ key: offer, text: offer }))}
        onPick={finish}
      />
    </span>
  );
}
