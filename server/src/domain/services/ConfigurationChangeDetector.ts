import { Configuration } from '@domain/entities/Configuration';
import { Rack, Box } from '@domain/valueObjects/Equipment';
import {
  ConfigurationUpdatedEvent,
  TankUpdatedEvent,
  TankAddedEvent,
  TankDeletedEvent,
  RackAddedEvent,
  RackDeletedEvent,
  RackUpdatedEvent,
  BoxAddedEvent,
  BoxDeletedEvent,
  BoxUpdatedEvent,
  LabNameChangedEvent,
  RackAccessSharedEvent,
  RackAccessRevokedEvent,
  BoxAccessSharedEvent,
  BoxAccessRevokedEvent
} from '@domain/events/ConfigurationEvents';

/**
 * Change summary for high-level configuration updates
 */
export interface ConfigurationChangeSummary {
  tanksAdded: number;
  tanksUpdated: number;
  tanksDeleted: number;
  racksAdded: number;
  racksUpdated: number;
  racksDeleted: number;
  boxesAdded: number;
  boxesUpdated: number;
  boxesDeleted: number;
  labNameChanged: boolean;
}

/**
 * Configuration Change Detector
 *
 * Domain service that compares two Configuration entities
 * and generates domain events for all detected changes.
 *
 * Handles the nested hierarchy: Configuration → Tanks → Racks → Boxes
 */
export class ConfigurationChangeDetector {
  /**
   * Detect all changes between old and new configurations
   *
   * @param oldConfig - Previous configuration state
   * @param newConfig - New configuration state
   * @param userId - User who made the changes
   * @returns Array of domain events representing all changes
   */
  detectChanges(oldConfig: Configuration, newConfig: Configuration, userId: string): any[] {
    const events: any[] = [];
    const summary: ConfigurationChangeSummary = {
      tanksAdded: 0,
      tanksUpdated: 0,
      tanksDeleted: 0,
      racksAdded: 0,
      racksUpdated: 0,
      racksDeleted: 0,
      boxesAdded: 0,
      boxesUpdated: 0,
      boxesDeleted: 0,
      labNameChanged: false
    };

    // Detect lab name changes
    if (oldConfig.systemSettings.labName !== newConfig.systemSettings.labName) {
      events.push(new LabNameChangedEvent(
        userId,
        oldConfig.systemSettings.labName,
        newConfig.systemSettings.labName
      ));
      summary.labNameChanged = true;
    }

    // Detect tank-level changes
    const oldTanks = oldConfig.equipment.tanks;
    const newTanks = newConfig.equipment.tanks;

    const oldTankMap = new Map(oldTanks.map(t => [t.id, t]));
    const newTankMap = new Map(newTanks.map(t => [t.id, t]));

    // Detect added tanks
    for (const newTank of newTanks) {
      if (!oldTankMap.has(newTank.id)) {
        events.push(new TankAddedEvent(userId, newTank.id, newTank.name));
        summary.tanksAdded++;
      }
    }

    // Detect deleted tanks
    for (const oldTank of oldTanks) {
      if (!newTankMap.has(oldTank.id)) {
        events.push(new TankDeletedEvent(userId, oldTank.id, oldTank.name));
        summary.tanksDeleted++;
      }
    }

    // Detect updated tanks (name or isActive changes)
    for (const newTank of newTanks) {
      const oldTank = oldTankMap.get(newTank.id);
      if (oldTank) {
        const tankChanges: Array<{ field: string; oldValue: any; newValue: any }> = [];

        if (oldTank.name !== newTank.name) {
          tankChanges.push({
            field: 'name',
            oldValue: oldTank.name,
            newValue: newTank.name
          });
        }

        if (oldTank.isActive !== newTank.isActive) {
          tankChanges.push({
            field: 'isActive',
            oldValue: oldTank.isActive,
            newValue: newTank.isActive
          });
        }

        if (tankChanges.length > 0) {
          events.push(new TankUpdatedEvent(userId, newTank.id, newTank.name, tankChanges));
          summary.tanksUpdated++;
        }

        // Detect rack-level changes within this tank
        const rackEvents = this.detectRackChanges(oldTank.racks, newTank.racks, newTank.id, newTank.name, userId, summary);
        events.push(...rackEvents);
      }
    }

    // Add summary event if any changes detected
    if (events.length > 0) {
      events.push(new ConfigurationUpdatedEvent(userId, summary));
    }

    return events;
  }

  /**
   * Detect rack-level changes within a tank
   */
  private detectRackChanges(
    oldRacks: readonly Rack[],
    newRacks: readonly Rack[],
    tankId: string,
    tankName: string,
    userId: string,
    summary: ConfigurationChangeSummary
  ): any[] {
    const events: any[] = [];

    const oldRackMap = new Map(oldRacks.map(r => [r.id, r]));
    const newRackMap = new Map(newRacks.map(r => [r.id, r]));

    // Detect added racks
    for (const newRack of newRacks) {
      if (!oldRackMap.has(newRack.id)) {
        events.push(new RackAddedEvent(userId, tankId, tankName, newRack.id, newRack.name));
        summary.racksAdded++;
      }
    }

    // Detect deleted racks
    for (const oldRack of oldRacks) {
      if (!newRackMap.has(oldRack.id)) {
        events.push(new RackDeletedEvent(userId, tankId, tankName, oldRack.id, oldRack.name));
        summary.racksDeleted++;
      }
    }

    // Detect updated racks
    for (const newRack of newRacks) {
      const oldRack = oldRackMap.get(newRack.id);
      if (oldRack) {
        const rackChanges: Array<{ field: string; oldValue: any; newValue: any }> = [];

        if (oldRack.name !== newRack.name) {
          rackChanges.push({
            field: 'name',
            oldValue: oldRack.name,
            newValue: newRack.name
          });
        }

        if (oldRack.isActive !== newRack.isActive) {
          rackChanges.push({
            field: 'isActive',
            oldValue: oldRack.isActive,
            newValue: newRack.isActive
          });
        }

        if (rackChanges.length > 0) {
          events.push(new RackUpdatedEvent(userId, tankId, tankName, newRack.id, newRack.name, rackChanges));
          summary.racksUpdated++;
        }

        // Detect sharedWithUserIds changes
        const sharingEvents = this.detectRackSharingChanges(
          oldRack, newRack, tankId, tankName, userId
        );
        events.push(...sharingEvents);

        // Detect box-level changes within this rack
        const boxEvents = this.detectBoxChanges(oldRack.boxes, newRack.boxes, tankId, tankName, newRack.id, newRack.name, userId, summary);
        events.push(...boxEvents);
      }
    }

    return events;
  }

  /**
   * Detect sharing changes for a rack
   */
  private detectRackSharingChanges(
    oldRack: Rack,
    newRack: Rack,
    tankId: string,
    tankName: string,
    userId: string
  ): any[] {
    const events: any[] = [];
    const oldShared = new Set(oldRack.sharedWithUserIds);
    const newShared = new Set(newRack.sharedWithUserIds);

    // Find newly shared users
    const addedUsers = newRack.sharedWithUserIds.filter(id => !oldShared.has(id));
    if (addedUsers.length > 0) {
      events.push(new RackAccessSharedEvent(
        userId, tankId, tankName, newRack.id, newRack.name, addedUsers
      ));
    }

    // Find revoked users
    const revokedUsers = oldRack.sharedWithUserIds.filter(id => !newShared.has(id));
    if (revokedUsers.length > 0) {
      events.push(new RackAccessRevokedEvent(
        userId, tankId, tankName, newRack.id, newRack.name, revokedUsers
      ));
    }

    return events;
  }

  /**
   * Detect box-level changes within a rack
   */
  private detectBoxChanges(
    oldBoxes: readonly Box[],
    newBoxes: readonly Box[],
    tankId: string,
    tankName: string,
    rackId: string,
    rackName: string,
    userId: string,
    summary: ConfigurationChangeSummary
  ): any[] {
    const events: any[] = [];

    const oldBoxMap = new Map(oldBoxes.map(b => [b.name, b]));
    const newBoxMap = new Map(newBoxes.map(b => [b.name, b]));

    // Detect added boxes
    for (const newBox of newBoxes) {
      if (!oldBoxMap.has(newBox.name)) {
        events.push(new BoxAddedEvent(userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name));
        summary.boxesAdded++;
      }
    }

    // Detect deleted boxes
    for (const oldBox of oldBoxes) {
      if (!newBoxMap.has(oldBox.name)) {
        events.push(new BoxDeletedEvent(userId, tankId, tankName, rackId, rackName, oldBox.name, oldBox.name));
        summary.boxesDeleted++;
      }
    }

    // Detect updated boxes
    for (const newBox of newBoxes) {
      const oldBox = oldBoxMap.get(newBox.name);
      if (oldBox) {
        const boxChanges: Array<{ field: string; oldValue: any; newValue: any }> = [];

        // Check grid configuration changes
        if (oldBox.gridConfig.rows !== newBox.gridConfig.rows) {
          boxChanges.push({
            field: 'gridConfig.rows',
            oldValue: oldBox.gridConfig.rows,
            newValue: newBox.gridConfig.rows
          });
        }

        if (oldBox.gridConfig.cols !== newBox.gridConfig.cols) {
          boxChanges.push({
            field: 'gridConfig.cols',
            oldValue: oldBox.gridConfig.cols,
            newValue: newBox.gridConfig.cols
          });
        }

        if (oldBox.isActive !== newBox.isActive) {
          boxChanges.push({
            field: 'isActive',
            oldValue: oldBox.isActive,
            newValue: newBox.isActive
          });
        }

        if (boxChanges.length > 0) {
          events.push(new BoxUpdatedEvent(userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name, boxChanges));
          summary.boxesUpdated++;
        }

        // Detect sharedWithUserIds changes
        const sharingEvents = this.detectBoxSharingChanges(
          oldBox, newBox, tankId, tankName, rackId, rackName, userId
        );
        events.push(...sharingEvents);
      }
    }

    return events;
  }

  /**
   * Detect sharing changes for a box
   */
  private detectBoxSharingChanges(
    oldBox: Box,
    newBox: Box,
    tankId: string,
    tankName: string,
    rackId: string,
    rackName: string,
    userId: string
  ): any[] {
    const events: any[] = [];
    const oldShared = new Set(oldBox.sharedWithUserIds);
    const newShared = new Set(newBox.sharedWithUserIds);

    // Find newly shared users
    const addedUsers = newBox.sharedWithUserIds.filter(id => !oldShared.has(id));
    if (addedUsers.length > 0) {
      events.push(new BoxAccessSharedEvent(
        userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name, addedUsers
      ));
    }

    // Find revoked users
    const revokedUsers = oldBox.sharedWithUserIds.filter(id => !newShared.has(id));
    if (revokedUsers.length > 0) {
      events.push(new BoxAccessRevokedEvent(
        userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name, revokedUsers
      ));
    }

    return events;
  }
}
