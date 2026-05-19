/**
 * Shell Config Context
 *
 * Carries the active modal's chrome configuration to AuthGatewayPanel.
 */

import { type RefObject, createContext } from 'react';

type ShellVariant = 'console' | 'stack';
type ShellWidth = 'narrow' | 'wide';

export interface ShellConfig {
  /** Stable identifier per modal+state. When this changes, the content area replays its entrance animation. */
  contentKey: string;
  variant: ShellVariant;
  width: ShellWidth;
  /** true = icon + wordmark, 'icon' = icon-only (stack variant), false = no brand block. */
  showBranding: boolean | 'icon';
  brandTagline?: string;
  brandGreeting?: string;
  microheader?: string;
  initialFocusRef?: RefObject<HTMLElement>;
}

interface ShellContextValue {
  config: ShellConfig | null;
  setConfig: (config: ShellConfig) => void;
}

export const ShellConfigContext = createContext<ShellContextValue | null>(null);
