/**
 * Getting Started Tab
 *
 * Orientation guide for the main dashboard, plus a launchpad linking out to the
 * deeper topic tabs.
 */
import { isAdminRole } from '@odysseus/shared-schemas';
import { MousePointerClick, Share2, UsersRound, Lock } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { AlertBanner, SubsectionHeader, Well } from '@shared/ui';

import { HELP_TABS } from '../../../../content/helpContent';
import { useHelpNav } from '../HelpNavContext';
import { HelpSection } from '../HelpSection';

import type { HelpTabId } from '../../../../content/helpContent';

const TAB_BLURBS: Partial<Record<HelpTabId, string>> = {
  tubes: 'What every element on a tube cell means — lock states and color coding.',
  storage: 'How tanks, racks, and boxes nest, plus ownership and permissions.',
  donors: 'Browse donor profiles and collection history, and link donors to tubes.',
  researchers: 'How users and researchers differ, and how tubes connect to them.',
  shortcuts: 'Keyboard shortcuts for the grid, the navigator, and the app.',
  administration: 'Manage users, security, catalog values, and system settings.',
};

export function GettingStartedTab() {
  const { user } = useAuthStore();
  const { goToTab } = useHelpNav();
  const isDemo = user?.isDemo ?? false;
  const isAdmin = isAdminRole(user?.role);

  const quickLinks = HELP_TABS.filter(
    tab => tab.id !== 'getting-started' && (isAdmin || !tab.adminOnly)
  );

  return (
    <div className="space-y-8">
      {/* Section A: Navigating the Grid */}
      <HelpSection id="gs-grid">
        <p className="text-xs text-muted-foreground mb-2">
          Use the navigator sidebar to browse tanks, racks, and boxes. Click a tube in the grid to
          open the Tube Information panel on the right, where you can see its details — cell type,
          donor, researcher, lock status, shared access, and location. Your current location is
          always visible above the grid.
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1 flex-wrap">
          Racks and boxes assigned to you display your initials. Common (unassigned) spaces show the{' '}
          <UsersRound size={13} className="text-secondary-foreground inline -mt-px" /> icon.
        </p>
      </HelpSection>

      {/* Section B: Adding & Editing Tubes */}
      <HelpSection id="gs-edit">
        <p className="text-xs text-muted-foreground">
          Click an empty position to add a tube. Double-click an existing tube to edit it, or
          right-click for more options. Select multiple tubes to bulk add or edit. You can also
          copy, cut, and paste tubes between positions. You can only add or edit tubes in boxes
          assigned to you or marked as common.
        </p>
      </HelpSection>

      {/* Section C: Locking & Sharing */}
      <HelpSection id="gs-lock">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MousePointerClick size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-card-foreground font-medium">Lock</span> a tube to prevent
              others from editing it. Add a lock note to explain why.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Share2 size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-card-foreground font-medium">Share</span> access with specific
              users so they can still edit a tube you&apos;ve locked.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Lock size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              See the{' '}
              <button
                type="button"
                onClick={() => goToTab('tubes')}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Tubes
              </button>{' '}
              tab for the full lock-state legend.
            </p>
          </div>
        </div>
      </HelpSection>

      {/* Section D: Search */}
      <HelpSection id="gs-search">
        <p className="text-xs text-muted-foreground">
          Find tubes across all storage using the search bar. Use advanced filters to narrow results
          by cell type, donor, researcher, location, and more. Clicking a result navigates directly
          to that tube in the grid. You can also export your search results to CSV.
        </p>
      </HelpSection>

      {/* Explore: launchpad to the deeper topic tabs */}
      <section>
        <SubsectionHeader title="Explore the Guide" accent className="mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map(tab => {
            const Icon = tab.icon;
            return (
              <Well
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                className="group flex items-start gap-3 p-3 text-left"
              >
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-none border border-line-faint bg-black/30 text-secondary-foreground">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-card-foreground">
                    {tab.label}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {TAB_BLURBS[tab.id]}
                  </span>
                </span>
              </Well>
            );
          })}
        </div>
      </section>

      {isDemo && (
        <AlertBanner variant="demo" spacing="none" className="text-xs">
          <span className="font-medium">Demo Mode</span> — You&apos;re exploring a sandboxed
          environment. You can freely add, edit, and delete tubes within the demo tanks, but account
          and password changes are disabled.
        </AlertBanner>
      )}
    </div>
  );
}
