/**
 * By User Tab
 *
 * Displays storage assignments grouped by user with bulk reassign/unassign controls.
 */

import { useMemo, useState, useCallback } from 'react';

import { formatResourceDisplayName, type UserDisplayInfo } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { UsersRound, ChevronDown, UserRoundX, UserRoundPen } from 'lucide-react';

import { Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';
import { RackIcon, BoxIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { buildUserAssignments, buildRackGroups } from './buildUserAssignments';
import { TreeLinesByUser } from './TreeLinesByUser';

import type { LabConfiguration } from '@domains/storage';
import type { UserInfo } from '@domains/storage/hooks/useStorageOwnership';

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

export function ByUserTab({
  lab,
  getUserInfo,
  currentUserId,
  canManageStorage = false,
  users = [],
  onBulkUnassign,
  onBulkReassign,
}: ByUserTabProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string | null>>(() => new Set());

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

  const assignmentsByUser = useMemo(
    () => buildUserAssignments(lab, getUserInfo, currentUserId),
    [lab, getUserInfo, currentUserId]
  );

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

          const racks = userAssignment.assignments.filter(a => a.type === 'rack');
          const boxes = userAssignment.assignments.filter(a => a.type === 'box');
          const badgeType = isUnassigned
            ? 'unassigned'
            : isCurrentUser
              ? 'currentUser'
              : 'otherUser';
          const isReassigning = reassigningUserId === userAssignment.userId;
          const showOverflowMenu =
            canManageStorage && !isUnassigned && userAssignment.userId && !isReassigning;

          return (
            <Collapsible.Root
              key={userAssignment.userId ?? 'unassigned'}
              open={isExpanded}
              onOpenChange={() => toggleUser(userAssignment.userId)}
            >
              <div data-level="user" data-id={userAssignment.userId ?? 'unassigned'}>
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
                      type={badgeType}
                      initials={userAssignment.initials}
                      username={userAssignment.username}
                      size="md"
                    />
                    <span className="storage-nav-button__text">{userAssignment.displayName}</span>

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

                <Collapsible.Content className="overflow-visible">
                  {userAssignment.assignments.length > 0 && (
                    <div className="storage-nav-children mt-1 space-y-1">
                      {buildRackGroups(racks, boxes).map(rackGroup => (
                        <div
                          key={`rack-${rackGroup.tankId}-${rackGroup.rackId}`}
                          data-level="rack"
                          data-id={`${rackGroup.tankId}-${rackGroup.rackId}`}
                        >
                          <div className="storage-nav-item--modal storage-nav-item--rack">
                            <button
                              type="button"
                              className="storage-nav-button storage-nav-button--rack"
                              aria-label={`${rackGroup.tankName} / ${rackGroup.rackName}`}
                            >
                              <UserBadge
                                type={badgeType}
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
                                        type={badgeType}
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
                      ))}
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
