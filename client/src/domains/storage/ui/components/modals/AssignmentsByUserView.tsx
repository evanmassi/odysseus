import { useMemo, useState } from 'react';

import { formatResourceDisplayName, type UserDisplayInfo } from '@odysseus/shared-schemas';
import { UsersRound, ChevronDown, ChevronRight, UserRoundX, UserRoundPen } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { RackIcon, BoxIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { OwnershipBadge } from './OwnershipBadge';
import { StorageManagerContext } from './StorageManagerContext';

import type { LabConfiguration } from '@domains/storage';

interface UserInfo {
  initials: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface AssignmentsByUserViewProps {
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
 * Assignments By User View
 *
 * Displays resource assignments grouped by user, providing a user-centric
 * view of who owns what in the storage system.
 *
 * Handles inheritance: boxes with undefined assignedUserId inherit from their rack.
 */
export function AssignmentsByUserView({
  lab,
  getUserInfo,
  currentUserId,
  canManageStorage = false,
  users = [],
  onBulkUnassign,
  onBulkReassign,
}: AssignmentsByUserViewProps) {
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

  if (assignmentsByUser.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <UsersRound size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No resource assignments found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assignmentsByUser.map(userAssignment => {
        const isExpanded = expandedUsers.has(userAssignment.userId);
        const isCurrentUser = userAssignment.userId === currentUserId;
        const isUnassigned = userAssignment.userId === null;

        // Left border accent with subtle tint (modern, less visual weight)
        const headerLeftBorder = isCurrentUser
          ? 'border-l-ownership-user-badge'
          : isUnassigned
            ? 'border-l-ownership-unassigned-badge'
            : 'border-l-ownership-other-badge';

        // Hover-only background for cleaner look
        const headerBg = 'hover:bg-slate-50/50 transition-colors';

        // Badge colors - centralized via CSS variables
        const badgeBg = isCurrentUser
          ? 'bg-ownership-user-badge'
          : isUnassigned
            ? 'bg-ownership-unassigned-badge'
            : 'bg-ownership-other-badge';

        // Group assignments by rack for better display
        const racks = userAssignment.assignments.filter(a => a.type === 'rack');
        const boxes = userAssignment.assignments.filter(a => a.type === 'box');

        // Check if showing reassign dropdown for this user
        const isReassigning = reassigningUserId === userAssignment.userId;

        return (
          <div key={userAssignment.userId ?? 'unassigned'} className="rounded-lg overflow-hidden">
            {/* User Header */}
            <div
              className={`flex items-center gap-3 px-3 py-2 ${headerBg} border-l-4 ${headerLeftBorder}`}
            >
              {/* Expand/Collapse Button */}
              <button
                type="button"
                onClick={() => toggleUser(userAssignment.userId)}
                className="flex items-center gap-3 flex-1 hover:brightness-95 transition-all text-left focus-ring-default rounded -m-1 p-1"
                aria-expanded={isExpanded}
              >
                <div className="text-slate-600" aria-hidden="true">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                {/* User Avatar/Initials */}
                <div
                  className={`w-6 h-6 rounded-full ${badgeBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {isUnassigned ? <UsersRound size={14} /> : userAssignment.initials}
                </div>

                {/* Username */}
                <span className="font-medium text-slate-800 text-sm flex-1 truncate">
                  {userAssignment.displayName}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-xs text-ice-700 font-normal">(you)</span>
                  )}
                </span>

                {/* Counts - styled like ownership badges */}
                <div className="flex items-center gap-2 text-xs">
                  {userAssignment.rackCount > 0 && (
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-white ${badgeBg}`}
                    >
                      <RackIcon size={12} />
                      {userAssignment.rackCount}
                    </span>
                  )}
                  {userAssignment.boxCount > 0 && (
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-white ${badgeBg}`}
                    >
                      <BoxIcon size={12} />
                      {userAssignment.boxCount}
                    </span>
                  )}
                </div>
              </button>

              {/* Bulk Action Buttons - Admin only, not for unassigned section */}
              {canManageStorage && !isUnassigned && userAssignment.userId && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isReassigning ? (
                    // Reassign dropdown - role="presentation" since this div only stops event propagation
                    <div
                      className="flex items-center gap-1"
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
                          className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-black/10 transition-colors focus-ring-default"
                        >
                          ×
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    // Action buttons - icon only with tooltip
                    <>
                      <Tooltip content="Reassign all resources to another user" side="bottom">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setReassigningUserId(userAssignment.userId);
                          }}
                          className="text-slate-700 hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
                        >
                          <UserRoundPen size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Unassign all resources from this user" side="bottom">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (onBulkUnassign) {
                              onBulkUnassign(userAssignment.userId!);
                            }
                          }}
                          className="text-red-700 hover:bg-red-500/20 transition-colors p-1 rounded focus-ring-default"
                        >
                          <UserRoundX size={14} />
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Assignments List */}
            {isExpanded && userAssignment.assignments.length > 0 && (
              <div className="ml-11 mt-1 mb-2 space-y-1">
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

                  // Rack row styling - left border accent only, hover-only background
                  const rackLeftBorderClass = isCurrentUser
                    ? 'border-l-ownership-user-badge'
                    : isUnassigned
                      ? 'border-l-ownership-unassigned-badge'
                      : 'border-l-ownership-other-badge';
                  // Badge colors - centralized via CSS variables
                  const rackBadgeClass = isCurrentUser
                    ? 'bg-ownership-user-badge text-white'
                    : isUnassigned
                      ? 'bg-ownership-unassigned-badge text-white'
                      : 'bg-ownership-other-badge text-white';
                  const boxLeftBorderClass = isCurrentUser
                    ? 'border-l-ownership-user-badge'
                    : isUnassigned
                      ? 'border-l-ownership-unassigned-badge'
                      : 'border-l-ownership-other-badge';

                  return rackGroups.map(rackGroup => (
                    <div key={`rack-${rackGroup.tankId}-${rackGroup.rackId}`}>
                      {/* Rack row - styled like tree view */}
                      <div
                        className={`flex items-center gap-1.5 py-1 px-1.5 hover:bg-slate-50/50 transition-colors border-l-4 ${rackLeftBorderClass}`}
                      >
                        <StorageManagerContext.Consumer>
                          {ctx =>
                            ctx && (
                              <OwnershipBadge
                                userId={userAssignment.userId ?? undefined}
                                size="md"
                                isOwnedByCurrentUser={isCurrentUser}
                              />
                            )
                          }
                        </StorageManagerContext.Consumer>
                        <RackIcon size={18} className="text-slate-700 flex-shrink-0" />
                        <span className="font-medium text-slate-800 text-sm">
                          {rackGroup.tankName} /{' '}
                          {formatResourceDisplayName(rackGroup.rackName, rackGroup.rackCustomLabel)}
                        </span>
                        {!rackGroup.ownsRack && (
                          <span className="text-xs text-slate-500 italic">(boxes only)</span>
                        )}
                        {rackGroup.boxes.length > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded ${rackBadgeClass}`}>
                            {rackGroup.boxes.length}{' '}
                            {rackGroup.boxes.length === 1 ? 'box' : 'boxes'}
                          </span>
                        )}
                      </div>

                      {/* Boxes under this rack */}
                      {rackGroup.boxes.length > 0 && (
                        <div className="ml-5 mt-0.5 space-y-0.5">
                          {rackGroup.boxes.map(box => (
                            <div
                              key={`box-${box.tankId}-${box.rackId}-${box.boxId}`}
                              className={`flex items-center gap-1.5 py-0.5 px-1.5 hover:bg-slate-50/50 transition-colors border-l-4 ${boxLeftBorderClass}`}
                            >
                              <StorageManagerContext.Consumer>
                                {ctx =>
                                  ctx && (
                                    <OwnershipBadge
                                      userId={userAssignment.userId ?? undefined}
                                      size="sm"
                                      isOwnedByCurrentUser={isCurrentUser}
                                    />
                                  )
                                }
                              </StorageManagerContext.Consumer>
                              <BoxIcon size={16} className="text-slate-700 flex-shrink-0" />
                              <span className="font-medium text-slate-800 text-xs">
                                {formatResourceDisplayName(box.boxName!, box.boxCustomLabel)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
