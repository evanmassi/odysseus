/**
 * Edit Modal Form Hook
 *
 * Manages form state lifecycle for edit modals (init, reset on open, submit wrapper).
 */

import { useState, useEffect, useCallback } from 'react';

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
