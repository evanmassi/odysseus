import { useMemo, useState, useCallback } from 'react';

import { formatResourceDisplayName, type UserDisplayInfo } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { UsersRound, ChevronDown, UserRoundX, UserRoundPen } from 'lucide-react';

import { Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { UserBadge } from '@shared/ui/components';
import { RackIcon, BoxIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { TreeLinesByUser } from './TreeLinesByUser';
import '../../../storage-navigator/storage-navigator.css';

import type { LabConfiguration } from '@domains/storage';

interface UserInfo {
  initials: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface ByUserTabProps {
  lab: LabConfiguration;
  getUserInfo: (userId: string) => UserInfo | null;
  currentUserId?: string;
  /** Whether current user can manage storage (admin) */
  canManageStorage?: boolean;
  /** List of users for reassignment dropdown */
  users?: UserDisplayInfo[];
  /** Called when admin wants to unassign all resources from a user */
  onBulkUnassign?: (userId: string) => void;
  /** Called when admin wants to reassign all resources from one user to another */
  onBulkReassign?: (fromUserId: string, toUserId: string) => void;
}

interface ResourceAssignment {
  type: 'rack' | 'box';
  tankId: string;
  tankName: string;
  rackId: string;
  rackName: string;
  rackCustomLabel?: string;
  boxId?: string;
  boxName?: string;
  boxCustomLabel?: string;
  isInherited?: boolean; // true if box inherits from rack
}

interface UserAssignments {
  userId: string | null; // null = unassigned/common
  username: string;
  initials: string;
  firstName?: string;
  lastName?: string;
  displayName: string; // Formatted display name: "Last, First (username)" or just username
  assignments: ResourceAssignment[];
  rackCount: number;
  boxCount: number;
  inheritedBoxCount: number;
}

/**
 * Assignment By User View
 *
 * Displays resource assignments grouped by user, providing a user-centric
 * view of who owns what in the storage system.
 *
 * Handles inheritance: boxes with undefined assignedUserId inherit from their rack.
 */
export function ByUserTab({
  lab,
  getUserInfo,
  currentUserId,
  canManageStorage = false,
  users = [],
  onBulkUnassign,
  onBulkReassign,
}: ByUserTabProps) {
  // Track expanded/collapsed users
  const [expandedUsers, setExpandedUsers] = useState<Set<string | null>>(() => new Set());

  // Track which user row is showing the reassign dropdown
  const [reassigningUserId, setReassigningUserId] = useState<string | null>(null);

  const toggleUser = (userId: string | null) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Group assignments by user (handling inheritance)
  const assignmentsByUser = useMemo(() => {
    const grouped = new Map<string | null, ResourceAssignment[]>();

    // Helper to add assignment to a user's group
    const addAssignment = (userId: string | null, assignment: ResourceAssignment) => {
      if (!grouped.has(userId)) {
        grouped.set(userId, []);
      }
      grouped.get(userId)!.push(assignment);
    };

    // Iterate through all tanks, racks, boxes
    for (const tank of lab.equipment.tanks) {
      for (const rack of tank.racks) {
        // Determine rack owner (string = assigned, null/undefined = unassigned)
        const rackOwnerId = rack.assignedUserId ?? null;

        // Add rack assignment
        addAssignment(rackOwnerId, {
          type: 'rack',
          tankId: tank.id,
          tankName: tank.name,
          rackId: rack.id,
          rackName: rack.name,
          rackCustomLabel: rack.customLabel,
        });

        // Process boxes
        for (const box of rack.boxes) {
          if (box.assignedUserId === undefined) {
            // Box inherits from rack - add to rack owner with inherited flag
            addAssignment(rackOwnerId, {
              type: 'box',
              tankId: tank.id,
              tankName: tank.name,
              rackId: rack.id,
              rackName: rack.name,
              rackCustomLabel: rack.customLabel,
              boxId: box.id,
              boxName: box.name,
              boxCustomLabel: box.customLabel,
              isInherited: true,
            });
          } else {
            // Box has explicit assignment (string or null)
            addAssignment(box.assignedUserId, {
              type: 'box',
              tankId: tank.id,
              tankName: tank.name,
              rackId: rack.id,
              rackName: rack.name,
              rackCustomLabel: rack.customLabel,
              boxId: box.id,
              boxName: box.name,
              boxCustomLabel: box.customLabel,
              isInherited: false,
            });
          }
        }
      }
    }

    // Convert to array and build UserAssignments objects
    const result: UserAssignments[] = [];

    for (const [userId, assignments] of grouped) {
      const rackCount = assignments.filter(a => a.type === 'rack').length;
      const boxes = assignments.filter(a => a.type === 'box');
      const boxCount = boxes.length;
      const inheritedBoxCount = boxes.filter(b => b.isInherited).length;

      if (userId === null) {
        result.push({
          userId: null,
          username: 'Unassigned / Common',
          initials: '?',
          displayName: 'Unassigned / Common',
          assignments,
          rackCount,
          boxCount,
          inheritedBoxCount,
        });
      } else {
        const userInfo = getUserInfo(userId);
        const username = userInfo?.username ?? `Unknown (${userId.slice(0, 8)}...)`;
        const firstName = userInfo?.firstName;
        const lastName = userInfo?.lastName;

        // Format display name: "Last, First (username)" or fallback to username
        const displayName =
          firstName && lastName ? `${lastName}, ${firstName} (${username})` : username;

        result.push({
          userId,
          username,
          initials: userInfo?.initials ?? '??',
          firstName,
          lastName,
          displayName,
          assignments,
          rackCount,
          boxCount,
          inheritedBoxCount,
        });
      }
    }

    // Sort: current user first, then alphabetically by displayName, unassigned last
    result.sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      if (a.userId === null) return 1;
      if (b.userId === null) return -1;
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [lab, getUserInfo, currentUserId]);

  // Build overflow menu items for a user
  const buildOverflowMenuItems = useCallback(
    (userId: string): OverflowMenuItem[] => {
      const items: OverflowMenuItem[] = [
        {
          icon: UserRoundPen,
          label: 'Reassign All',
          onClick: () => setReassigningUserId(userId),
        },
        {
          icon: UserRoundX,
          label: 'Unassign All',
          onClick: () => {
            if (onBulkUnassign) {
              onBulkUnassign(userId);
            }
          },
          danger: true,
        },
      ];
      return items;
    },
    [onBulkUnassign]
  );

  if (assignmentsByUser.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <UsersRound size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No resource assignments found</p>
      </div>
    );
  }

  return (
    <div className="relative" role="tree" data-view="by-user">
      <TreeLinesByUser expandedUsers={expandedUsers} />
      <div className="space-y-1">
        {assignmentsByUser.map(userAssignment => {
          const isExpanded = expandedUsers.has(userAssignment.userId);
          const isCurrentUser = userAssignment.userId === currentUserId;
          const isUnassigned = userAssignment.userId === null;

          // Group assignments by rack for better display
          const racks = userAssignment.assignments.filter(a => a.type === 'rack');
          const boxes = userAssignment.assignments.filter(a => a.type === 'box');

          // Check if showing reassign dropdown for this user
          const isReassigning = reassigningUserId === userAssignment.userId;

          // Show overflow menu for assigned users when admin and not currently reassigning
          const showOverflowMenu =
            canManageStorage && !isUnassigned && userAssignment.userId && !isReassigning;

          return (
            <Collapsible.Root
              key={userAssignment.userId ?? 'unassigned'}
              open={isExpanded}
              onOpenChange={() => toggleUser(userAssignment.userId)}
            >
              <div data-level="user" data-id={userAssignment.userId ?? 'unassigned'}>
                {/* User Header - Navigator styled button */}
                <div className="storage-nav-item--modal storage-nav-item--tank">
                  <button
                    type="button"
                    onClick={() => toggleUser(userAssignment.userId)}
                    className={`storage-nav-button storage-nav-button--tank ${isExpanded ? 'selected' : ''}`}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${userAssignment.displayName}`}
                  >
                    <ChevronDown
                      size={14}
                      className={`storage-nav-button__chevron transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                    <UserBadge
                      type={
                        isUnassigned ? 'unassigned' : isCurrentUser ? 'currentUser' : 'otherUser'
                      }
                      initials={userAssignment.initials}
                      username={userAssignment.username}
                      size="md"
                    />
                    <span className="storage-nav-button__text">{userAssignment.displayName}</span>

                    {/* Counts - styled like ownership badges */}
                    <div className="flex items-center gap-1.5 text-xs mr-1">
                      {userAssignment.rackCount > 0 && (
                        <span className="storage-nav-pill storage-nav-pill--muted flex items-center gap-1">
                          <RackIcon size={12} />
                          {userAssignment.rackCount}
                        </span>
                      )}
                      {userAssignment.boxCount > 0 && (
                        <span className="storage-nav-pill storage-nav-pill--muted flex items-center gap-1">
                          <BoxIcon size={12} />
                          {userAssignment.boxCount}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Reassign dropdown (shown when reassigning) */}
                  {isReassigning && (
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      role="presentation"
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                    >
                      <AssignmentDropdown
                        value={undefined}
                        users={users.filter(u => u.id !== userAssignment.userId)}
                        onChange={toUserId => {
                          if (toUserId && onBulkReassign) {
                            onBulkReassign(userAssignment.userId!, toUserId);
                          }
                          setReassigningUserId(null);
                        }}
                        size="sm"
                      />
                      <Tooltip content="Cancel" side="bottom">
                        <button
                          type="button"
                          onClick={() => setReassigningUserId(null)}
                          className="text-muted-foreground hover:text-secondary-foreground p-1 rounded hover:bg-black/10 transition-colors"
                        >
                          ×
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* Overflow menu (shown when not reassigning) */}
                  {showOverflowMenu && (
                    <div className="flex-shrink-0">
                      <OverflowMenu
                        items={buildOverflowMenuItems(userAssignment.userId!)}
                        dividerBefore={['Unassign All']}
                        size="sm"
                        aria-label={`Actions for ${userAssignment.displayName}`}
                      />
                    </div>
                  )}
                </div>

                {/* Assignments List - collapsible with animation */}
                <Collapsible.Content className="overflow-visible data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                  {userAssignment.assignments.length > 0 && (
                    <div className="storage-nav-children mt-1 space-y-1">
                      {(() => {
                        // Build rack groups: combine owned racks with racks containing orphan boxes
                        const rackGroupMap = new Map<
                          string,
                          {
                            tankId: string;
                            tankName: string;
                            rackId: string;
                            rackName: string;
                            rackCustomLabel?: string;
                            ownsRack: boolean;
                            boxes: ResourceAssignment[];
                          }
                        >();

                        // Add racks the user owns
                        for (const rack of racks) {
                          const key = `${rack.tankId}-${rack.rackId}`;
                          const rackBoxes = boxes
                            .filter(b => b.tankId === rack.tankId && b.rackId === rack.rackId)
                            .sort((a, b) => (a.boxId ?? '').localeCompare(b.boxId ?? ''));
                          rackGroupMap.set(key, {
                            tankId: rack.tankId,
                            tankName: rack.tankName,
                            rackId: rack.rackId,
                            rackName: rack.rackName,
                            rackCustomLabel: rack.rackCustomLabel,
                            ownsRack: true,
                            boxes: rackBoxes,
                          });
                        }

                        // Add orphan boxes grouped by their parent rack
                        for (const box of boxes) {
                          const key = `${box.tankId}-${box.rackId}`;
                          if (!rackGroupMap.has(key)) {
                            // This is an orphan box - create a rack group for it
                            rackGroupMap.set(key, {
                              tankId: box.tankId,
                              tankName: box.tankName,
                              rackId: box.rackId,
                              rackName: box.rackName,
                              rackCustomLabel: box.rackCustomLabel,
                              ownsRack: false,
                              boxes: [],
                            });
                          }
                          const group = rackGroupMap.get(key)!;
                          // Only add if not already in the list (avoid duplicates)
                          if (!group.ownsRack && !group.boxes.some(b => b.boxId === box.boxId)) {
                            group.boxes.push(box);
                          }
                        }

                        // Sort boxes within each group and sort rack groups by tank/rack
                        const rackGroups = Array.from(rackGroupMap.values())
                          .map(group => ({
                            ...group,
                            boxes: group.boxes.sort((a, b) =>
                              (a.boxId ?? '').localeCompare(b.boxId ?? '')
                            ),
                          }))
                          .sort((a, b) => {
                            const tankCompare = a.tankName.localeCompare(b.tankName);
                            if (tankCompare !== 0) return tankCompare;
                            return a.rackId.localeCompare(b.rackId);
                          });

                        return rackGroups.map(rackGroup => (
                          <div
                            key={`rack-${rackGroup.tankId}-${rackGroup.rackId}`}
                            data-level="rack"
                            data-id={`${rackGroup.tankId}-${rackGroup.rackId}`}
                          >
                            {/* Rack row - Navigator styled */}
                            <div className="storage-nav-item--modal storage-nav-item--rack">
                              <button
                                type="button"
                                className="storage-nav-button storage-nav-button--rack"
                                aria-label={`${rackGroup.tankName} / ${rackGroup.rackName}`}
                              >
                                <UserBadge
                                  type={
                                    isUnassigned
                                      ? 'unassigned'
                                      : isCurrentUser
                                        ? 'currentUser'
                                        : 'otherUser'
                                  }
                                  initials={userAssignment.initials}
                                  username={userAssignment.username}
                                  size="md"
                                />
                                <div className="storage-nav-button__icon">
                                  <RackIcon size={16} aria-hidden="true" />
                                </div>
                                <span className="storage-nav-button__text">
                                  {rackGroup.tankName} /{' '}
                                  {formatResourceDisplayName(
                                    rackGroup.rackName,
                                    rackGroup.rackCustomLabel
                                  )}
                                  {!rackGroup.ownsRack && (
                                    <span className="ml-1.5 text-xs text-muted-foreground italic font-normal">
                                      (boxes only)
                                    </span>
                                  )}
                                </span>
                                {rackGroup.boxes.length > 0 && (
                                  <span className="storage-nav-pill storage-nav-pill--muted">
                                    {rackGroup.boxes.length}{' '}
                                    {rackGroup.boxes.length === 1 ? 'box' : 'boxes'}
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Boxes under this rack */}
                            {rackGroup.boxes.length > 0 && (
                              <div className="storage-nav-children mt-0.5 space-y-0.5">
                                {rackGroup.boxes.map(box => (
                                  <div
                                    key={`box-${box.tankId}-${box.rackId}-${box.boxId}`}
                                    data-level="box"
                                    data-id={box.boxId}
                                  >
                                    <div
                                      className="storage-nav-item--modal storage-nav-item--box"
                                      role="listitem"
                                    >
                                      <div className="storage-nav-button storage-nav-button--box">
                                        <UserBadge
                                          type={
                                            isUnassigned
                                              ? 'unassigned'
                                              : isCurrentUser
                                                ? 'currentUser'
                                                : 'otherUser'
                                          }
                                          initials={userAssignment.initials}
                                          username={userAssignment.username}
                                          size="sm"
                                        />
                                        <div className="storage-nav-button__icon">
                                          <BoxIcon size={14} aria-hidden="true" />
                                        </div>
                                        <span className="storage-nav-button__text">
                                          {formatResourceDisplayName(
                                            box.boxName!,
                                            box.boxCustomLabel
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </Collapsible.Content>
              </div>
            </Collapsible.Root>
          );
        })}
      </div>
    </div>
  );
}
