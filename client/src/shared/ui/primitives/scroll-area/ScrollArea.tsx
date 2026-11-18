import { forwardRef } from 'react';

import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react';

type ScrollAreaProps = OverlayScrollbarsComponentProps;

const CONTENT_RESIZE_EVENTS: Array<[string, string]> = [
  ['[data-state]', 'animationend transitionend'],
];

export const ScrollArea = forwardRef<OverlayScrollbarsComponentRef, ScrollAreaProps>(
  ({ options, defer = true, ...rest }, ref) => {
    const given = options === false ? {} : (options ?? {});
    return (
      <OverlayScrollbarsComponent
        ref={ref}
        defer={defer}
        options={{
          scrollbars: { theme: 'os-theme-odysseus', autoHide: 'move', autoHideDelay: 800 },
          ...given,
          update: {
            ...given.update,
            elementEvents: [...CONTENT_RESIZE_EVENTS, ...(given.update?.elementEvents ?? [])],
          },
        }}
        {...rest}
      />
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
