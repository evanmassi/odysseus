/**
 * Storage Configuration Change Detection
 *
 * Compares two Storage entities and emits domain events for all detected changes.
 */

import { Storage } from '@domain/entities/Storage';
import { Rack, Box } from '@domain/value-objects/Equipment';
import type { DomainEvent } from '@domain/events/DomainEvent';
import type { FieldChange } from '@domain/types/fieldChange';
import {
  StorageUpdatedEvent,
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
  RackAssignedEvent,
  RackUnassignedEvent,
  RackReassignedEvent,
  BoxAssignedEvent,
  BoxUnassignedEvent,
  BoxReassignedEvent
} from '@domain/events/StorageEvents';

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

export class StorageChangeService {
  detectChanges(oldConfig: Storage, newConfig: Storage, userId: string): DomainEvent[] {
    const events: DomainEvent[] = [];
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
        const tankChanges: FieldChange[] = [];

        if (oldTank.name !== newTank.name) {
          tankChanges.push({
            field: 'name',
            oldValue: oldTank.name,
            newValue: newTank.name
          });
        }

        if (oldTank.location !== newTank.location) {
          tankChanges.push({
            field: 'location',
            oldValue: oldTank.location,
            newValue: newTank.location
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
      events.push(new StorageUpdatedEvent(userId, summary));
    }

    return events;
  }

  private detectRackChanges(
    oldRacks: readonly Rack[],
    newRacks: readonly Rack[],
    tankId: string,
    tankName: string,
    userId: string,
    summary: ConfigurationChangeSummary
  ): DomainEvent[] {
    const events: DomainEvent[] = [];

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
        const rackChanges: FieldChange[] = [];

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

        // Detect assignedUserId changes
        const assignmentEvents = this.detectRackAssignmentChanges(
          oldRack, newRack, tankId, tankName, userId
        );
        events.push(...assignmentEvents);

        // Detect box-level changes within this rack
        const boxEvents = this.detectBoxChanges(oldRack.boxes, newRack.boxes, tankId, tankName, newRack.id, newRack.name, userId, summary);
        events.push(...boxEvents);
      }
    }

    return events;
  }

  private detectRackAssignmentChanges(
    oldRack: Rack,
    newRack: Rack,
    tankId: string,
    tankName: string,
    userId: string
  ): DomainEvent[] {
    const events: DomainEvent[] = [];
    const oldAssigned = oldRack.assignedUserId;
    const newAssigned = newRack.assignedUserId;

    // No change
    if (oldAssigned === newAssigned) {
      return events;
    }

    // Rack was unassigned (had user, now doesn't)
    if (oldAssigned && !newAssigned) {
      events.push(new RackUnassignedEvent(
        userId, tankId, tankName, newRack.id, newRack.name,
        oldAssigned, '' // Username not available here, will be resolved by client
      ));
    }
    // Rack was assigned (didn't have user, now does)
    else if (!oldAssigned && newAssigned) {
      events.push(new RackAssignedEvent(
        userId, tankId, tankName, newRack.id, newRack.name,
        newAssigned, '' // Username not available here, will be resolved by client
      ));
    }
    // Rack was reassigned (different user)
    else if (oldAssigned && newAssigned && oldAssigned !== newAssigned) {
      events.push(new RackReassignedEvent(
        userId, tankId, tankName, newRack.id, newRack.name,
        oldAssigned, '', // Previous username
        newAssigned, ''  // New username
      ));
    }

    return events;
  }

  private detectBoxChanges(
    oldBoxes: readonly Box[],
    newBoxes: readonly Box[],
    tankId: string,
    tankName: string,
    rackId: string,
    rackName: string,
    userId: string,
    summary: ConfigurationChangeSummary
  ): DomainEvent[] {
    const events: DomainEvent[] = [];

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
        const boxChanges: FieldChange[] = [];

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

        // Detect assignedUserId changes
        const assignmentEvents = this.detectBoxAssignmentChanges(
          oldBox, newBox, tankId, tankName, rackId, rackName, userId
        );
        events.push(...assignmentEvents);
      }
    }

    return events;
  }

  private detectBoxAssignmentChanges(
    oldBox: Box,
    newBox: Box,
    tankId: string,
    tankName: string,
    rackId: string,
    rackName: string,
    userId: string
  ): DomainEvent[] {
    const events: DomainEvent[] = [];
    const oldAssigned = oldBox.assignedUserId;
    const newAssigned = newBox.assignedUserId;

    // No change (handle null/undefined equivalence)
    if ((oldAssigned ?? undefined) === (newAssigned ?? undefined)) {
      return events;
    }

    // Box was unassigned (had user, now doesn't)
    if (oldAssigned && !newAssigned) {
      events.push(new BoxUnassignedEvent(
        userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name,
        oldAssigned, '' // Username not available here, will be resolved by client
      ));
    }
    // Box was assigned (didn't have user, now does)
    else if (!oldAssigned && newAssigned) {
      events.push(new BoxAssignedEvent(
        userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name,
        newAssigned, '' // Username not available here, will be resolved by client
      ));
    }
    // Box was reassigned (different user)
    else if (oldAssigned && newAssigned && oldAssigned !== newAssigned) {
      events.push(new BoxReassignedEvent(
        userId, tankId, tankName, rackId, rackName, newBox.name, newBox.name,
        oldAssigned, '', // Previous username
        newAssigned, ''  // New username
      ));
    }

    return events;
  }

}
