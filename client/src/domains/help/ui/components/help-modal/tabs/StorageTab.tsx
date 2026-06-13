/**
 * Storage Tab
 *
 * Explains the storage hierarchy, ownership model, and key workflows
 * in the Storage Manager.
 */
import { Grid3X3, ShieldUser, Tag, UserRound } from 'lucide-react';

import { Well } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { BoxIcon } from '@shared/ui/components/icons/BoxIcon';

import { HelpSection } from '../HelpSection';
import { StorageHierarchyExample } from '../StorageHierarchyExample';

export function StorageTab() {
  return (
    <div className="space-y-8">
      {/* Section A: Storage Hierarchy */}
      <HelpSection id="storage-hierarchy">
        <StorageHierarchyExample />
      </HelpSection>

      {/* Section B: Ownership & Assignment */}
      <HelpSection id="storage-ownership">
        <p className="text-xs text-muted-foreground mb-3">
          Racks and boxes can be assigned to users. Badges in the Storage Manager indicate ownership
          at a glance.
        </p>

        {/* Ownership badges */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Well className="flex flex-col items-center gap-2 p-3">
            <UserBadge type="currentUser" initials="ME" size="md" />
            <span className="text-xs font-medium text-card-foreground">Yours</span>
            <span className="text-[11px] text-muted-foreground text-center">Assigned to you</span>
          </Well>
          <Well className="flex flex-col items-center gap-2 p-3">
            <UserBadge type="otherUser" initials="JD" username="jdoe" size="md" />
            <span className="text-xs font-medium text-card-foreground">Other User</span>
            <span className="text-[11px] text-muted-foreground text-center">
              Assigned to someone else
            </span>
          </Well>
          <Well className="flex flex-col items-center gap-2 p-3">
            <UserBadge type="unassigned" size="md" />
            <span className="text-xs font-medium text-card-foreground">Common</span>
            <span className="text-[11px] text-muted-foreground text-center">
              Unassigned, shared by all
            </span>
          </Well>
        </div>

        {/* Inheritance explanation */}
        <Well className="p-3">
          <h4 className="text-xs font-medium text-card-foreground mb-1">Default Assignment</h4>
          <p className="text-xs text-muted-foreground">
            Boxes inherit their rack&apos;s owner by default. An admin can override this by
            assigning a box to a different user or marking it as common.
          </p>
        </Well>
      </HelpSection>

      {/* Section C: Roles & Permissions */}
      <HelpSection id="storage-roles">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-none border border-line-faint bg-black/20 flex-shrink-0">
              <ShieldUser size={18} className="text-secondary-foreground" />
            </div>
            <div className="pt-0.5">
              <span className="text-xs font-medium text-card-foreground">Admin</span>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>Create, rename, and delete tanks, racks, and boxes</li>
                <li>Set grid sizes per box</li>
                <li>Assign or reassign resources to users</li>
                <li>Bulk reassign all of a user&apos;s resources</li>
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-none border border-line-faint bg-black/20 flex-shrink-0">
              <UserRound size={18} className="text-secondary-foreground" />
            </div>
            <div className="pt-0.5">
              <span className="text-xs font-medium text-card-foreground">User</span>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>View all storage structure</li>
                <li>Add custom labels to racks and boxes assigned to them</li>
              </ul>
            </div>
          </div>
        </div>
      </HelpSection>

      {/* Section D: Quick Reference */}
      <HelpSection id="storage-quick-ref">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Tag size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-card-foreground font-medium">Custom Labels</span> — add a
              personal label to any rack or box you own. The system name is preserved underneath.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Grid3X3 size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-card-foreground font-medium">Grid Sizes</span> — boxes support
              5x5, 6x6, 7x7, 8x8, 9x9 (default), and 10x10 grids. Admins can change the size per
              box.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <BoxIcon size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-card-foreground font-medium">Bulk Creation</span> — admins can
              add up to 50 racks or 26 boxes (A–Z) at once.
            </p>
          </div>
        </div>
      </HelpSection>
    </div>
  );
}
