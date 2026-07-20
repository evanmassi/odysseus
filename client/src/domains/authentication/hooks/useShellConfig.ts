/**
 * Shell Chrome Declaration
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

  // No deps: re-sync config every render (panel bails on an equal config to avoid a loop).
  // useLayoutEffect commits before paint — no one-frame flash of stale chrome.
  useLayoutEffect(() => {
    ctx.setConfig(config);
  });
}
