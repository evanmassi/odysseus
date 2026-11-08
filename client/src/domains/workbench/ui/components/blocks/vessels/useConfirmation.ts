import { useCallback, useState } from 'react';

export interface Confirmation {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const ask = useCallback(
    (request: Confirmation) =>
      setConfirmation({
        ...request,
        onConfirm: () => {
          setConfirmation(undefined);
          request.onConfirm();
        },
      }),
    []
  );
  return { confirmation, ask, dismiss: () => setConfirmation(undefined) };
}
