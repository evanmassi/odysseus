/**
 * Use Shell Config
 *
 * Modal hook that pushes its chrome configuration up to AuthGatewayPanel.
 */

import { useContext, useLayoutEffect } from 'react';

import { ShellConfigContext, type ShellConfig } from '../ui/components/gateway/shellConfigContext';

export function useShellConfig(config: ShellConfig): void {
  const ctx = useContext(ShellConfigContext);
  if (!ctx) {
    throw new Error('useShellConfig must be used inside <AuthGatewayPanel>');
  }

  // useLayoutEffect — config commits before paint, no one-frame flash of stale chrome.
  useLayoutEffect(() => {
    ctx.setConfig(config);
  });
}
