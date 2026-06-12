/**
 * Help Navigation Context
 *
 * Lets help content jump to another tab or scroll to a specific section,
 * powering the Getting Started quick links and the search results.
 */
import { createContext, useContext } from 'react';

import type { HelpTabId } from '../../../content/helpContent';

export interface HelpNav {
  goToTab: (tab: HelpTabId) => void;
  goToSection: (sectionId: string) => void;
}

export const HelpNavContext = createContext<HelpNav | null>(null);

export function useHelpNav(): HelpNav {
  const ctx = useContext(HelpNavContext);
  if (!ctx) throw new Error('useHelpNav must be used within the Help modal');
  return ctx;
}
