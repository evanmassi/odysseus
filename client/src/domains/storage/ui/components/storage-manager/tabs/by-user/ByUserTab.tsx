/**
 * By User Tab
 *
 * Displays storage assignments grouped by user with bulk reassign/unassign controls.
 */

import { useMemo, useState, useCallback } from 'react';

import { formatStorageDisplayName } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { UsersRound, ChevronDown, UserRoundX, UserRoundPen } from 'lucide-react';

import { Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';
import { RackIcon, BoxIcon } from '@shared/ui/components/icons';

import { TreeNub } from '../../../storage-navigator/TreeNub';
import { RowMeta } from '../by-location/RowMeta';

import { AssignmentDropdown } from './AssignmentDropdown';
import { buildUserAssignments, buildRackGroups } from './buildUserAssignments';
import { TreeLinesByUser } from './TreeLinesByUser';

import type { UserInfo } from '../../../../../hooks/useStorageOwnership';
import type { LabConfiguration, UserDisplayInfo } from '@odysseus/shared-schemas';

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
  onBulkReassign?: (fromUserId: string | undefined, toUserId: string) => void;
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

  const [reassigningUserId, setReassigningUserId] = useState<string | null | undefined>(undefined);

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
    (userId: string | null): OverflowMenuItem[] => {
      const items: OverflowMenuItem[] = [
        {
          icon: UserRoundPen,
          label: 'Reassign All',
          onClick: () => setReassigningUserId(userId),
        },
      ];
      if (userId !== null) {
        items.push({
          icon: UserRoundX,
          label: 'Unassign All',
          onClick: () => {
            if (onBulkUnassign) {
              onBulkUnassign(userId);
            }
          },
          danger: true,
        });
      }
      return items;
    },
    [onBulkUnassign]
  );

  if (assignmentsByUser.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <UsersRound size={48} className="mb-4 opacity-50" />
        <p className="text-body-sm">No resource assignments found</p>
      </div>
    );
  }

  return (
    <div className="relative" data-view="by-user" data-tree-id="modal-user">
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
          const showOverflowMenu = canManageStorage && !isReassigning;
          const metaParts = [
            userAssignment.rackCount > 0
              ? `${userAssignment.rackCount} ${userAssignment.rackCount === 1 ? 'rack' : 'racks'}`
              : null,
            userAssignment.boxCount > 0
              ? `${userAssignment.boxCount} ${userAssignment.boxCount === 1 ? 'box' : 'boxes'}`
              : null,
          ].filter((part): part is string => part !== null);

          return (
            <Collapsible.Root
              key={userAssignment.userId ?? 'unassigned'}
              open={isExpanded}
              onOpenChange={() => toggleUser(userAssignment.userId)}
            >
              <div data-level="user" data-id={userAssignment.userId ?? 'unassigned'}>
                <div className="storage-nav-item--modal storage-nav-item--tank">
                  <div
                    onClick={() => toggleUser(userAssignment.userId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') toggleUser(userAssignment.userId);
                    }}
                    className={`storage-nav-button storage-nav-button--tank ${isExpanded ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${userAssignment.displayName}`}
                  >
                    <ChevronDown
                      size={14}
                      className={`storage-nav-button__chevron transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                    <div className="flex w-5 flex-shrink-0 justify-center">
                      {showOverflowMenu && (
                        <div
                          role="presentation"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          <OverflowMenu
                            items={buildOverflowMenuItems(userAssignment.userId)}
                            dividerBefore={['Unassign All']}
                            size="sm"
                            aria-label={`Actions for ${userAssignment.displayName}`}
                          />
                        </div>
                      )}
                    </div>
                    <UserBadge
                      type={badgeType}
                      initials={userAssignment.initials}
                      username={userAssignment.username}
                      size="md"
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="min-w-0 truncate">{userAssignment.displayName}</span>
                      <RowMeta parts={metaParts} />
                    </div>
                  </div>

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
                            onBulkReassign(userAssignment.userId ?? undefined, toUserId);
                          }
                          setReassigningUserId(undefined);
                        }}
                        currentUserId={currentUserId}
                      />
                      <Tooltip content="Cancel" side="bottom">
                        <button
                          type="button"
                          onClick={() => setReassigningUserId(undefined)}
                          className="text-muted-foreground hover:text-secondary-foreground p-1 rounded hover:bg-shade/10 transition-colors"
                        >
                          ×
                        </button>
                      </Tooltip>
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
                            <div className="storage-nav-button storage-nav-button--rack">
                              <TreeNub />
                              <UserBadge
                                type={badgeType}
                                initials={userAssignment.initials}
                                username={userAssignment.username}
                                size="md"
                              />
                              <div className="storage-nav-button__icon">
                                <RackIcon size={16} aria-hidden="true" />
                              </div>
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="min-w-0 truncate">
                                  {rackGroup.tankName} /{' '}
                                  {formatStorageDisplayName(
                                    rackGroup.rackName,
                                    rackGroup.rackCustomLabel
                                  )}
                                  {!rackGroup.ownsRack && (
                                    <span className="ml-1.5 text-caption text-muted-foreground italic font-normal">
                                      (boxes only)
                                    </span>
                                  )}
                                </span>
                                {rackGroup.boxes.length > 0 && (
                                  <RowMeta
                                    parts={[
                                      `${rackGroup.boxes.length} ${rackGroup.boxes.length === 1 ? 'box' : 'boxes'}`,
                                    ]}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {rackGroup.boxes.length > 0 && (
                            <div className="storage-nav-children mt-0.5 space-y-0.5">
                              {rackGroup.boxes.map(box => (
                                <div
                                  key={`box-${box.tankId}-${box.rackId}-${box.boxId}`}
                                  data-level="box"
                                  data-id={box.boxId}
                                >
                                  <div className="storage-nav-item--modal storage-nav-item--box">
                                    <div className="storage-nav-button storage-nav-button--box">
                                      <TreeNub />
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
                                        {formatStorageDisplayName(box.boxName!, box.boxCustomLabel)}
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
