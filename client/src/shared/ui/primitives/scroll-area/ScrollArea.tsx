/**
 * Scroll Area
 *
 * Themed scrollbar wrapper built on OverlayScrollbars.
 */

import { forwardRef } from 'react';

import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react';

type ScrollAreaProps = OverlayScrollbarsComponentProps;

export const ScrollArea = forwardRef<OverlayScrollbarsComponentRef, ScrollAreaProps>(
  ({ options, defer = true, ...rest }, ref) => {
    return (
      <OverlayScrollbarsComponent
        ref={ref}
        defer={defer}
        options={{
          scrollbars: { theme: 'os-theme-odysseus', autoHide: 'move', autoHideDelay: 800 },
          // Recompute scrollbars when [data-state] elements finish animating (content resizes).
          update: { elementEvents: [['[data-state]', 'animationend transitionend']] },
          ...options,
        }}
        {...rest}
      />
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
