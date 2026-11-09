import { useEffect, useRef } from 'react';

export function useFocusLeave(onLeave: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    onBlur: () => {
      clearTimeout(timer.current);
      // PITFALL: focus can hop into a portaled dropdown; its onFocus bubbles here through React and cancels the leave.
      timer.current = setTimeout(onLeave);
    },
    onFocus: () => clearTimeout(timer.current),
  };
}
