import { useCallback, useEffect, useRef, useState } from 'react';

import { Plus } from 'lucide-react';

import { Button, NumberInput, Tooltip } from '@shared/ui';

interface AddStorageToolProps {
  noun: string;
  pluralNoun: string;
  max: number;
  limitLabel?: string;
  isLimitReached: boolean;
  onAdd: (count: number, options: { onSuccess: () => void }) => void;
}

export function AddStorageTool({
  noun,
  pluralNoun,
  max,
  limitLabel,
  isLimitReached,
  onAdd,
}: AddStorageToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(1);
  const pickerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setCount(1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={isLimitReached}
        className="h-6 text-label-sm"
        leftIcon={<Plus className="w-3 h-3" />}
      >
        {noun}
      </Button>
    );
  }

  return (
    <div ref={pickerRef} data-pinned className="flex items-center gap-2">
      {limitLabel && <span className="text-caption text-muted-foreground">{limitLabel}</span>}
      <Tooltip content={`Number of ${pluralNoun.toLowerCase()} to add`} side="bottom">
        <NumberInput
          value={count}
          onChange={setCount}
          min={1}
          max={max}
          size="xs"
          aria-label={`Number of ${pluralNoun.toLowerCase()} to add`}
        />
      </Tooltip>
      <Button
        variant="primary"
        size="xs"
        onClick={() => onAdd(count, { onSuccess: close })}
        leftIcon={<Plus size={12} />}
        disabled={isLimitReached}
      >
        Add {count > 1 ? pluralNoun : noun}
      </Button>
    </div>
  );
}
