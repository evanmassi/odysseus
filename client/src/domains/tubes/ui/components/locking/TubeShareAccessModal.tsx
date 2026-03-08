/**
 * ShareAccessModal - Modal for sharing tube access with other users
 *
 * Allows lock owners to:
 * - Share access to locked tubes with specific users
 * - View currently shared users
 * - Revoke access from users
 *
 * @module tubes/ui/components/modals
 */

import { useState, useMemo } from 'react';

import { Share2, X, UserRoundPlus, UsersRound } from 'lucide-react';

import { useShareTubeAccessMutation, useRevokeTubeAccessMutation } from '@domains/tubes/hooks';
import { useActiveUsersQuery } from '@domains/users';
import { AlertBanner, Button, Checkbox } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import type { TubeData } from '@domains/tubes/types';

export interface TubeShareAccessModalProps {
  /** Whether modal is open - controls visibility with exit animation */
  isOpen?: boolean;
  /** Tubes to share access for (must be locked by current user) */
  tubes: TubeData[];
  /** Current user's ID */
  currentUserId: string;
  /** Close handler */
  onClose: () => void;
  /** Optional callback after successful share/revoke */
  onSuccess?: () => void;
}

/**
 * ShareAccessModal Component
 *
 * @example
 * ```tsx
 * <ShareAccessModal
 *   tubes={selectedLockedTubes}
 *   currentUserId={user.id}
 *   onClose={() => setShowShareModal(false)}
 *   onSuccess={() => clearSelection()}
 * />
 * ```
 */
export function TubeShareAccessModal({
  isOpen = true,
  tubes,
  currentUserId,
  onClose,
  onSuccess,
}: TubeShareAccessModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const shareMutation = useShareTubeAccessMutation();
  const revokeMutation = useRevokeTubeAccessMutation();

  // Fetch active users for the dropdown (server filters to approved users only)
  const { data: allUsers = [], isLoading: isLoadingUsers } = useActiveUsersQuery();

  // Filter out current user from available users
  const availableUsers = useMemo(() => {
    return allUsers.filter(u => u.id !== currentUserId);
  }, [allUsers, currentUserId]);

  // Get currently shared user IDs across all selected tubes
  const currentlySharedUserIds = useMemo(() => {
    const sharedSet = new Set<string>();
    tubes.forEach(tube => {
      tube.sharedWithUserIds?.forEach(userId => sharedSet.add(userId));
    });
    return Array.from(sharedSet);
  }, [tubes]);

  // Get user display name
  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return userId;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName} (${user.username})`;
    }
    return user.username ?? userId;
  };

  // Handle sharing access
  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      notifications.warning('Please select at least one user to share with');
      return;
    }

    try {
      const result = await shareMutation.mutateAsync({
        tubeIds: tubes.map(t => t.id),
        userIds: selectedUserIds,
      });

      const sharedCount = result.shared.length;
      const skippedCount = result.skipped.length;

      if (sharedCount > 0 && skippedCount === 0) {
        notifications.success(
          `Shared access to ${sharedCount} tube${sharedCount !== 1 ? 's' : ''}`
        );
        setSelectedUserIds([]);
        onSuccess?.();
      } else if (sharedCount > 0 && skippedCount > 0) {
        notifications.success(
          `Shared ${sharedCount} tube${sharedCount !== 1 ? 's' : ''}. ${skippedCount} skipped.`
        );
        setSelectedUserIds([]);
      } else {
        notifications.warning('No tubes were shared');
      }
    } catch (error) {
      notifications.error('Failed to share tube access');
    }
  };

  // Handle revoking access
  const handleRevoke = async (userId: string) => {
    try {
      const result = await revokeMutation.mutateAsync({
        tubeIds: tubes.map(t => t.id),
        userIds: [userId],
      });

      const revokedCount = result.revoked.length;
      if (revokedCount > 0) {
        notifications.success(`Revoked access from ${getUserName(userId)}`);
        onSuccess?.();
      } else {
        notifications.warning('No access was revoked');
      }
    } catch (error) {
      notifications.error('Failed to revoke access');
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const isProcessing = shareMutation.isPending || revokeMutation.isPending;
  const tubeCount = tubes.length;

  return (
    <BaseModal
      isOpen={isOpen}
      title={tubeCount === 1 ? 'Share Access' : `Share Access (${tubeCount} tubes)`}
      icon={<Share2 size={24} />}
      onClose={onClose}
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* Currently Shared Users */}
        {currentlySharedUserIds.length > 0 && (
          <div>
            <h4 className="block text-sm font-medium text-secondary-foreground mb-2">
              <UsersRound className="inline-block w-4 h-4 mr-1" />
              Currently Shared With
            </h4>
            <div className="space-y-2">
              {currentlySharedUserIds.map(userId => (
                <div
                  key={userId}
                  className="flex items-center justify-between px-3 py-2 bg-action/10 border border-action rounded-lg"
                >
                  <span className="text-sm text-action font-medium">{getUserName(userId)}</span>
                  <button
                    type="button"
                    onClick={() => handleRevoke(userId)}
                    disabled={isProcessing}
                    className="p-1 text-action hover:text-danger-text hover:bg-danger-light rounded transition-colors disabled:opacity-50"
                    title="Revoke access"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Users Section */}
        <div>
          <h4 className="block text-sm font-medium text-secondary-foreground mb-2">
            <UserRoundPlus className="inline-block w-4 h-4 mr-1" />
            Share With Users
          </h4>

          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-action"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
            </div>
          ) : availableUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No other users available</p>
          ) : (
            <ScrollArea className="max-h-48 border border-border rounded-lg divide-y divide-muted">
              {availableUsers
                .filter(u => !currentlySharedUserIds.includes(u.id))
                .map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                        isSelected ? 'bg-action/10' : ''
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                      <span className="ml-3 text-sm text-secondary-foreground">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName} (${user.username})`
                          : (user.username ?? user.id)}
                      </span>
                    </label>
                  );
                })}
            </ScrollArea>
          )}
        </div>

        {/* Info text */}
        <AlertBanner variant="info" spacing="none" className="text-xs">
          Shared users can edit tubes. Only you can unlock or revoke access.
        </AlertBanner>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {currentlySharedUserIds.length > 0 ? 'Done' : 'Cancel'}
          </Button>
          {selectedUserIds.length > 0 && (
            <Button
              variant="primary"
              onClick={handleShare}
              isLoading={isProcessing}
              loadingText="Sharing..."
            >
              Share with {selectedUserIds.length} User{selectedUserIds.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
