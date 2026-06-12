/**
 * Help Section
 *
 * Wraps a help topic with its registry-driven numbered header and a stable anchor
 * so the search box can jump to it. Title and ordinal come from the content registry.
 */
import type { ReactNode } from 'react';

import { SubsectionHeader } from '@shared/ui';

import { getHelpSection, getHelpSectionIndex } from '../../../content/helpContent';

interface HelpSectionProps {
  /** Registry id; supplies the title, ordinal, and the anchor used for search-jump. */
  id: string;
  children: ReactNode;
}

export function HelpSection({ id, children }: HelpSectionProps) {
  const meta = getHelpSection(id);
  if (!meta) return null;

  return (
    <section id={id} data-help-section={id} className="scroll-mt-2">
      <SubsectionHeader
        title={meta.title}
        index={getHelpSectionIndex(id)}
        accent
        className="mb-3"
      />
      {children}
    </section>
  );
}
