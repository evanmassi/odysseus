/**
 * Pure utility functions for immutable updates to LabConfiguration
 * Used by StorageManagementModal for local state management
 */

import type {
  LabConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
} from '@domains/storage';

// Tank operations

export function addTankToLab(lab: LabConfiguration, tank: TankConfiguration): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: [...lab.equipment.tanks, tank],
    },
  };
}

export function updateTankInLab(
  lab: LabConfiguration,
  tankId: string,
  updates: Partial<TankConfiguration>
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId ? { ...tank, ...updates, updatedAt: new Date().toISOString() } : tank
      ),
    },
  };
}

export function deleteTankFromLab(lab: LabConfiguration, tankId: string): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.filter(tank => tank.id !== tankId),
    },
  };
}

// Rack operations

export function addRackToLab(
  lab: LabConfiguration,
  tankId: string,
  rack: RackConfiguration
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? { ...tank, racks: [...tank.racks, rack], updatedAt: new Date().toISOString() }
          : tank
      ),
    },
  };
}

export function updateRackInLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  updates: Partial<RackConfiguration>
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? {
              ...tank,
              racks: tank.racks.map(rack => (rack.id === rackId ? { ...rack, ...updates } : rack)),
              updatedAt: new Date().toISOString(),
            }
          : tank
      ),
    },
  };
}

export function deleteRackFromLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? {
              ...tank,
              racks: tank.racks.filter(rack => rack.id !== rackId),
              updatedAt: new Date().toISOString(),
            }
          : tank
      ),
    },
  };
}

// Box operations

export function addBoxToLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  box: BoxConfiguration
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? {
              ...tank,
              racks: tank.racks.map(rack =>
                rack.id === rackId ? { ...rack, boxes: [...rack.boxes, box] } : rack
              ),
              updatedAt: new Date().toISOString(),
            }
          : tank
      ),
    },
  };
}

export function updateBoxInLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  boxId: string,
  updates: Partial<BoxConfiguration>
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? {
              ...tank,
              racks: tank.racks.map(rack =>
                rack.id === rackId
                  ? {
                      ...rack,
                      boxes: rack.boxes.map(box =>
                        box.id === boxId ? { ...box, ...updates } : box
                      ),
                    }
                  : rack
              ),
              updatedAt: new Date().toISOString(),
            }
          : tank
      ),
    },
  };
}

export function deleteBoxFromLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  boxId: string
): LabConfiguration {
  return {
    ...lab,
    equipment: {
      ...lab.equipment,
      tanks: lab.equipment.tanks.map(tank =>
        tank.id === tankId
          ? {
              ...tank,
              racks: tank.racks.map(rack =>
                rack.id === rackId
                  ? {
                      ...rack,
                      boxes: rack.boxes.filter(box => box.id !== boxId),
                    }
                  : rack
              ),
              updatedAt: new Date().toISOString(),
            }
          : tank
      ),
    },
  };
}

// Assignment operations

export function assignRackInLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  userId: string | undefined
): LabConfiguration {
  // When unassigning rack, also reset all boxes to undefined (clean slate)
  const tank = lab.equipment.tanks.find(t => t.id === tankId);
  const rack = tank?.racks.find(r => r.id === rackId);

  let updatedLab = lab;

  if (userId === undefined && rack) {
    // Reset all boxes in this rack
    for (const box of rack.boxes) {
      updatedLab = updateBoxInLab(updatedLab, tankId, rackId, box.id, {
        assignedUserId: undefined,
        customLabel: '',
      });
    }
  }

  // Update the rack assignment
  return updateRackInLab(updatedLab, tankId, rackId, {
    assignedUserId: userId,
    customLabel: userId ? undefined : '',
  });
}

export function assignBoxInLab(
  lab: LabConfiguration,
  tankId: string,
  rackId: string,
  boxId: string,
  userId: string | null | undefined
): LabConfiguration {
  return updateBoxInLab(lab, tankId, rackId, boxId, {
    assignedUserId: userId,
    // Clear label when making common (null) or reverting to inherit (undefined)
    customLabel: typeof userId === 'string' ? undefined : '',
  });
}

export function updateCustomLabelInLab(
  lab: LabConfiguration,
  type: 'rack' | 'box',
  tankId: string,
  rackId: string,
  boxId: string | undefined,
  label: string
): LabConfiguration {
  if (type === 'rack') {
    return updateRackInLab(lab, tankId, rackId, {
      customLabel: label.trim() || undefined,
    });
  } else if (boxId) {
    return updateBoxInLab(lab, tankId, rackId, boxId, {
      customLabel: label.trim() || undefined,
    });
  }
  return lab;
}
