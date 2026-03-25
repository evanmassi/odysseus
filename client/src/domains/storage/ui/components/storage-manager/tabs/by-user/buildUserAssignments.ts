/**
 * User Assignment Builder
 *
 * Groups storage resources by assigned user for the By User tab display.
 */

import type { UserInfo } from '@domains/storage/hooks/useStorageOwnership';
import type { LabConfiguration } from '@odysseus/shared-schemas';

export interface ResourceAssignment {
  type: 'rack' | 'box';
  tankId: string;
  tankName: string;
  rackId: string;
  rackName: string;
  rackCustomLabel?: string;
  boxId?: string;
  boxName?: string;
  boxCustomLabel?: string;
  isInherited?: boolean;
}

export interface UserAssignments {
  userId: string | null;
  username: string;
  initials: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  assignments: ResourceAssignment[];
  rackCount: number;
  boxCount: number;
  inheritedBoxCount: number;
}

export function buildUserAssignments(
  lab: LabConfiguration,
  getUserInfo: (userId: string) => UserInfo | null,
  currentUserId?: string
): UserAssignments[] {
  const grouped = new Map<string | null, ResourceAssignment[]>();

  const addAssignment = (userId: string | null, assignment: ResourceAssignment) => {
    if (!grouped.has(userId)) {
      grouped.set(userId, []);
    }
    grouped.get(userId)!.push(assignment);
  };

  for (const tank of lab.equipment.tanks) {
    for (const rack of tank.racks) {
      const rackOwnerId = rack.assignedUserId ?? null;

      addAssignment(rackOwnerId, {
        type: 'rack',
        tankId: tank.id,
        tankName: tank.name,
        rackId: rack.id,
        rackName: rack.name,
        rackCustomLabel: rack.customLabel,
      });

      for (const box of rack.boxes) {
        if (box.assignedUserId === undefined) {
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

  result.sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    if (a.userId === null) return 1;
    if (b.userId === null) return -1;
    return a.displayName.localeCompare(b.displayName);
  });

  return result;
}

export function buildRackGroups(racks: ResourceAssignment[], boxes: ResourceAssignment[]) {
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

  for (const box of boxes) {
    const key = `${box.tankId}-${box.rackId}`;
    if (!rackGroupMap.has(key)) {
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
    if (!group.ownsRack && !group.boxes.some(b => b.boxId === box.boxId)) {
      group.boxes.push(box);
    }
  }

  return Array.from(rackGroupMap.values())
    .map(group => ({
      ...group,
      boxes: group.ownsRack
        ? group.boxes
        : group.boxes.sort((a, b) => (a.boxId ?? '').localeCompare(b.boxId ?? '')),
    }))
    .sort((a, b) => {
      const tankCompare = a.tankName.localeCompare(b.tankName);
      if (tankCompare !== 0) return tankCompare;
      return a.rackId.localeCompare(b.rackId);
    });
}
