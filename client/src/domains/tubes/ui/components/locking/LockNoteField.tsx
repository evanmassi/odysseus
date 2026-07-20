/**
 * Lock Note Field
 *
 * Shared labeled input for a tube lock note, with a live character counter.
 */

import { Notebook } from 'lucide-react';

import { Input } from '@shared/ui';

interface LockNoteFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export function LockNoteField({
  value,
  onValueChange,
  onKeyDown,
  placeholder = 'e.g., Project X - Donor 123',
}: LockNoteFieldProps) {
  return (
    <div>
      <label
        htmlFor="lockNote"
        className="flex items-center gap-1.5 text-body-sm font-medium text-secondary-foreground mb-1"
      >
        <Notebook className="w-4 h-4" />
        Lock Note (optional)
      </label>
      <div className="relative">
        <Input
          id="lockNote"
          type="text"
          value={value}
          onValueChange={onValueChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={100}
          fullWidth
          inputClassName="pr-12"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-caption text-muted-foreground/50 pointer-events-none">
          {value.length}/100
        </span>
      </div>
      <p className="text-caption text-muted-foreground mt-1">Provides context for the lock.</p>
    </div>
  );
}
