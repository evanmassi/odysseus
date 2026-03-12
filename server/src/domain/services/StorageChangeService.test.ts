/**
 * Storage Change Service Tests
 */

import { StorageChangeService } from './StorageChangeService';
import { Storage } from '@domain/entities/Storage';
import {
  StorageUpdatedEvent,
  TankAddedEvent,
  TankDeletedEvent,
  TankUpdatedEvent,
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

const USER_ID = 'user_1';
const LAB_ID = 'lab_1';

function createConfig(overrides: {
  labName?: string;
  tanks?: Array<{
    id: string;
    name: string;
    isActive?: boolean;
    location?: string;
    racks: Array<{
      id: string | number;
      name: string;
      isActive?: boolean;
      assignedUserId?: string;
      boxes: Array<{
        name: string;
        gridConfig?: { rows: number; cols: number };
        isActive?: boolean;
        assignedUserId?: string | null;
      }>;
    }>;
  }>;
} = {}): Storage {
  const defaultBox = { name: 'A', gridConfig: { rows: 9, cols: 9 } };
  const defaultRack = { id: '1', name: 'Rack 1', boxes: [defaultBox] };
  const defaultTank = { id: 'T1', name: 'Tank 1', racks: [defaultRack] };

  return Storage.fromData({
    tanks: overrides.tanks ?? [defaultTank],
    systemSettings: {
      labName: overrides.labName ?? 'Test Lab',
      defaultResearcher: '',
      autoSave: true,
      auditTrailEnabled: true,
      syncEnabled: false,
    },
  });
}

describe('StorageChangeService', () => {
  const service = new StorageChangeService();

  describe('no changes', () => {
    it('should return empty events when configs are identical', () => {
      const config = createConfig();
      const events = service.detectChanges(config, config, USER_ID, LAB_ID);
      expect(events).toHaveLength(0);
    });
  });

  describe('lab name changes', () => {
    it('should emit LabNameChangedEvent', () => {
      const oldConfig = createConfig({ labName: 'Old Lab' });
      const newConfig = createConfig({ labName: 'New Lab' });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      const labEvent = events.find(e => e instanceof LabNameChangedEvent) as LabNameChangedEvent;
      expect(labEvent).toBeDefined();
      expect(labEvent.oldName).toBe('Old Lab');
      expect(labEvent.newName).toBe('New Lab');
    });
  });

  describe('tank changes', () => {
    it('should detect added tank', () => {
      const oldConfig = createConfig({ tanks: [] });
      const newConfig = createConfig();
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof TankAddedEvent)).toBe(true);
      const summary = events.find(e => e instanceof StorageUpdatedEvent) as StorageUpdatedEvent;
      expect(summary.changesSummary.tanksAdded).toBe(1);
    });

    it('should detect deleted tank', () => {
      const oldConfig = createConfig();
      const newConfig = createConfig({ tanks: [] });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof TankDeletedEvent)).toBe(true);
      const summary = events.find(e => e instanceof StorageUpdatedEvent) as StorageUpdatedEvent;
      expect(summary.changesSummary.tanksDeleted).toBe(1);
    });

    it('should detect tank name change', () => {
      const oldConfig = createConfig({ tanks: [{ id: 'T1', name: 'Old Name', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }] });
      const newConfig = createConfig({ tanks: [{ id: 'T1', name: 'New Name', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }] });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      const tankUpdate = events.find(e => e instanceof TankUpdatedEvent) as TankUpdatedEvent;
      expect(tankUpdate).toBeDefined();
      expect(tankUpdate.changes).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name', oldValue: 'Old Name', newValue: 'New Name' })])
      );
    });

    it('should detect tank deactivation', () => {
      const oldConfig = createConfig({ tanks: [{ id: 'T1', name: 'Tank 1', isActive: true, racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }] });
      const newConfig = createConfig({ tanks: [{ id: 'T1', name: 'Tank 1', isActive: false, racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] }] });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      const tankUpdate = events.find(e => e instanceof TankUpdatedEvent) as TankUpdatedEvent;
      expect(tankUpdate).toBeDefined();
      expect(tankUpdate.changes).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'isActive' })])
      );
    });
  });

  describe('rack changes', () => {
    const baseTank = (racks: any[]) => [{ id: 'T1', name: 'Tank 1', racks }];
    const baseBox = { name: 'A' };

    it('should detect added rack', () => {
      const oldConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'R1', boxes: [baseBox] }]) });
      const newConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'R1', boxes: [baseBox] }, { id: '2', name: 'R2', boxes: [baseBox] }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackAddedEvent)).toBe(true);
    });

    it('should detect deleted rack', () => {
      const oldConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'R1', boxes: [baseBox] }, { id: '2', name: 'R2', boxes: [baseBox] }]) });
      const newConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'R1', boxes: [baseBox] }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackDeletedEvent)).toBe(true);
    });

    it('should detect rack name change', () => {
      const oldConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'Old Rack', boxes: [baseBox] }]) });
      const newConfig = createConfig({ tanks: baseTank([{ id: '1', name: 'New Rack', boxes: [baseBox] }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackUpdatedEvent)).toBe(true);
    });
  });

  describe('rack assignment changes', () => {
    const makeTank = (assignedUserId?: string) => [{
      id: 'T1', name: 'Tank 1',
      racks: [{ id: '1', name: 'R1', assignedUserId, boxes: [{ name: 'A' }] }]
    }];

    it('should detect rack assigned', () => {
      const oldConfig = createConfig({ tanks: makeTank(undefined) });
      const newConfig = createConfig({ tanks: makeTank('user_2') });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackAssignedEvent)).toBe(true);
    });

    it('should detect rack unassigned', () => {
      const oldConfig = createConfig({ tanks: makeTank('user_2') });
      const newConfig = createConfig({ tanks: makeTank(undefined) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackUnassignedEvent)).toBe(true);
    });

    it('should detect rack reassigned', () => {
      const oldConfig = createConfig({ tanks: makeTank('user_2') });
      const newConfig = createConfig({ tanks: makeTank('user_3') });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof RackReassignedEvent)).toBe(true);
    });
  });

  describe('box changes', () => {
    const makeTank = (boxes: any[]) => [{
      id: 'T1', name: 'Tank 1',
      racks: [{ id: '1', name: 'R1', boxes }]
    }];

    it('should detect added box', () => {
      const oldConfig = createConfig({ tanks: makeTank([{ name: 'A' }]) });
      const newConfig = createConfig({ tanks: makeTank([{ name: 'A' }, { name: 'B' }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxAddedEvent)).toBe(true);
    });

    it('should detect deleted box', () => {
      const oldConfig = createConfig({ tanks: makeTank([{ name: 'A' }, { name: 'B' }]) });
      const newConfig = createConfig({ tanks: makeTank([{ name: 'A' }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxDeletedEvent)).toBe(true);
    });

    it('should detect box grid config change', () => {
      const oldConfig = createConfig({ tanks: makeTank([{ name: 'A', gridConfig: { rows: 9, cols: 9 } }]) });
      const newConfig = createConfig({ tanks: makeTank([{ name: 'A', gridConfig: { rows: 10, cols: 10 } }]) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxUpdatedEvent)).toBe(true);
    });
  });

  describe('box assignment changes', () => {
    const makeTank = (assignedUserId?: string | null) => [{
      id: 'T1', name: 'Tank 1',
      racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A', assignedUserId }] }]
    }];

    it('should detect box assigned', () => {
      const oldConfig = createConfig({ tanks: makeTank(null) });
      const newConfig = createConfig({ tanks: makeTank('user_2') });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxAssignedEvent)).toBe(true);
    });

    it('should detect box unassigned', () => {
      const oldConfig = createConfig({ tanks: makeTank('user_2') });
      const newConfig = createConfig({ tanks: makeTank(null) });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxUnassignedEvent)).toBe(true);
    });

    it('should detect box reassigned', () => {
      const oldConfig = createConfig({ tanks: makeTank('user_2') });
      const newConfig = createConfig({ tanks: makeTank('user_3') });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events.some(e => e instanceof BoxReassignedEvent)).toBe(true);
    });
  });

  describe('summary event', () => {
    it('should append StorageUpdatedEvent with correct counts', () => {
      const oldConfig = createConfig({ tanks: [
        { id: 'T1', name: 'Tank 1', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
        { id: 'T2', name: 'Tank 2', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
      ]});
      const newConfig = createConfig({ tanks: [
        { id: 'T1', name: 'Tank 1 Renamed', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
        { id: 'T3', name: 'Tank 3', racks: [{ id: '1', name: 'R1', boxes: [{ name: 'A' }] }] },
      ]});
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      const summary = events.find(e => e instanceof StorageUpdatedEvent) as StorageUpdatedEvent;
      expect(summary).toBeDefined();
      expect(summary.changesSummary.tanksAdded).toBe(1);
      expect(summary.changesSummary.tanksDeleted).toBe(1);
      expect(summary.changesSummary.tanksUpdated).toBe(1);
    });

    it('should be the last event', () => {
      const oldConfig = createConfig({ labName: 'Old' });
      const newConfig = createConfig({ labName: 'New' });
      const events = service.detectChanges(oldConfig, newConfig, USER_ID, LAB_ID);

      expect(events[events.length - 1]).toBeInstanceOf(StorageUpdatedEvent);
    });
  });
});
