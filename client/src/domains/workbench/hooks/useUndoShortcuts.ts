import { useEffect } from 'react';

import { useWorkbenchStore } from '../stores/workbenchStore';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';

const isTypingIn = (target: EventTarget | null) =>
  target instanceof Element && target.closest(TEXT_ENTRY) !== null;

export function useUndoShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isTypingIn(event.target)) return;
      const key = event.key.toLowerCase();
      const { undo, redo } = useWorkbenchStore.getState();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
