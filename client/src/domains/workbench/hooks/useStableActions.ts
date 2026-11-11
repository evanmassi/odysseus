import { useRef, useState } from 'react';

type Action = (...args: never[]) => unknown;

export function useStableActions<Current extends { [Key in keyof Current]: Action }>(
  actions: Current
): Current {
  const latest = useRef(actions);
  latest.current = actions;
  const [stable] = useState(
    () =>
      Object.fromEntries(
        Object.keys(actions).map(key => [
          key,
          (...args: never[]) => (latest.current[key as keyof Current] as Action)(...args),
        ])
      ) as Current
  );
  return stable;
}
