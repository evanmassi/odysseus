import { useState, type ReactNode } from 'react';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';
import { withGreekLetters } from '../../../../utils/materials/greekLetters';

interface WorkbenchPlateNameFieldProps {
  name: string;
  shown: ReactNode;
  label: string;
  placeholder?: string;
  className: string;
  onRename: (name: string) => void;
}

const MIN_FIELD_CH = 14;
const FIELD_ROOM_CH = 4;

export function WorkbenchPlateNameField({
  name,
  shown,
  label,
  placeholder,
  className,
  onRename,
}: WorkbenchPlateNameFieldProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <button
        type="button"
        className={`inline-edit text-left ${className}`}
        onClick={() => setIsEditing(true)}
      >
        {shown}
      </button>
    );
  }

  return (
    <input
      ref={focusOnMount}
      defaultValue={name}
      aria-label={label}
      placeholder={placeholder}
      spellCheck={false}
      className="inline-edit-field max-w-none text-body-sm text-foreground"
      style={{ width: `${Math.max(MIN_FIELD_CH, name.length + FIELD_ROOM_CH)}ch` }}
      onBlur={event => {
        setIsEditing(false);
        const next = withGreekLetters(event.currentTarget.value.trim());
        if (next !== name) onRename(next);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') setIsEditing(false);
      }}
    />
  );
}
