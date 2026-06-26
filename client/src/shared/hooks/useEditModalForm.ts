/**
 * Edit Modal Form Hook
 *
 * Holds edit-modal form state and resets it when the modal opens.
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
