/**
 * Getting Started Tab
 *
 * Orientation guide covering core workflows: navigation, editing,
 * locking/sharing, and search.
 */
import {
  Lock,
  MousePointerClick,
  Navigation,
  PenLine,
  Search,
  Share2,
  UsersRound,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { AlertBanner } from '@shared/ui';

export function GettingStartedTab() {
  const { user } = useAuthStore();
  const isDemo = user?.isDemo ?? false;
  return (
    <div className="space-y-8">
      {/* Section A: Navigating the Grid */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Navigation size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Navigating the Grid</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Use the navigator sidebar to browse tanks, racks, and boxes. Click a tube in the grid to
          open the info panel on the right. Your current location is always visible above the grid
          or in the Tube Information panel.
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1 flex-wrap">
          Racks and boxes assigned to you display your initials. Common or unassigned spaces show
          the <UsersRound size={13} className="text-secondary-foreground inline -mt-px" /> icon.
        </p>
      </section>

      {/* Section B: Adding & Editing Tubes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <PenLine size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Adding & Editing Tubes</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Click an empty position to add a tube. Double-click an existing tube to edit it, or
          right-click for more options. Select multiple tubes to batch add or edit. You can only add
          or edit tubes in boxes assigned to you or marked as common.
        </p>
      </section>

      {/* Section C: Locking & Sharing */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Locking & Sharing</h3>
        </div>
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
        </div>
      </section>

      {/* Section D: Search */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-secondary-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Search</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Find tubes across all storage using the search bar. Use advanced filters to narrow results
          by cell type, donor, researcher, location, and more. Clicking a result navigates directly
          to that tube in the grid. You can also export your search results to CSV.
        </p>
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
