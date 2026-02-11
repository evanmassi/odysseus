import { forwardRef } from 'react';

import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react';

export interface ScrollAreaProps
  extends Omit<OverlayScrollbarsComponentProps, 'options' | 'defer'> {
  options?: OverlayScrollbarsComponentProps['options'];
  defer?: OverlayScrollbarsComponentProps['defer'];
}

export const ScrollArea = forwardRef<OverlayScrollbarsComponentRef, ScrollAreaProps>(
  ({ options, defer = true, ...rest }, ref) => {
    return (
      <OverlayScrollbarsComponent
        ref={ref}
        defer={defer}
        options={{
          scrollbars: { theme: 'os-theme-odysseus', autoHide: 'move', autoHideDelay: 800 },
          ...options,
        }}
        {...rest}
      />
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
