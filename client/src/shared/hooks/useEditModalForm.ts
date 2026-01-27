import { useState, useEffect, useCallback } from 'react';

/**
 * Manages common edit modal form lifecycle:
 * - Form state initialized from a value
 * - Resets when modal opens
 * - Provides a submit handler wrapper (preventDefault + fire-and-forget)
 */
export function useEditModalForm<T>(isOpen: boolean, initialValue: T) {
  const [formData, setFormData] = useState<T>(initialValue);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialValue);
    }
  }, [isOpen, initialValue]);

  const createSubmitHandler = useCallback(
    (saveFn: () => Promise<void> | void) => (e: React.FormEvent) => {
      e.preventDefault();
      void saveFn();
    },
    []
  );

  return { formData, setFormData, createSubmitHandler };
}
