/**
 * Help Search Results
 *
 * Flat, jumpable list of sections matching the query across all tabs.
 */
import { SearchX } from 'lucide-react';

import { Well } from '@shared/ui';

import { HELP_TAB_META, searchHelpSections } from '../../../content/helpContent';

import { useHelpNav } from './HelpNavContext';

interface HelpSearchResultsProps {
  query: string;
  includeAdmin: boolean;
}

export function HelpSearchResults({ query, includeAdmin }: HelpSearchResultsProps) {
  const { goToSection } = useHelpNav();
  const results = searchHelpSections(query, includeAdmin);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <SearchX size={28} className="text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">No help topics match “{query.trim()}”.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map(section => {
        const tab = HELP_TAB_META[section.tabId];
        const SectionIcon = section.icon;
        return (
          <Well
            key={section.id}
            onClick={() => goToSection(section.id)}
            className="group flex w-full items-center gap-3 px-3 py-2.5 text-left"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-none border border-line-faint bg-shade/30 text-secondary-foreground">
              <SectionIcon size={15} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
              {section.title}
            </span>
            <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {tab.label}
            </span>
          </Well>
        );
      })}
    </div>
  );
}
