/**
 * Audit Log Formatters
 *
 * Utility functions for formatting audit log entry details for display.
 * Extracts formatting logic from AuditLogViewer component.
 */

import type { AuditLogEntry } from '@odysseus/shared-schemas';

/**
 * Format audit log entry details for display
 *
 * Parses the JSON details field and formats it based on entity type and action.
 * Returns a human-readable string describing what happened.
 *
 * @param entry - The audit log entry to format
 * @returns Formatted details string
 */
export function formatAuditDetails(entry: AuditLogEntry): string {
  try {
    const details = JSON.parse(entry.details);
    const action = entry.action;
    const entityType = entry.entityType;

    // TUBES: Show location or bulk update count
    if (entityType === 'tube') {
      if (action === 'tube_bulk_updated' && details.count) {
        return `${details.count} tube${details.count !== 1 ? 's' : ''} updated`;
      }
      if (details.displayLocation) return details.displayLocation;
      if (details.location) return details.location;
      return '-';
    }

    // TANK EVENTS
    if (entityType === 'tank') {
      if (action === 'tank_created') {
        const tankName = details.tankName || details.tankId || '';
        return `Tank '${tankName}'`;
      }
      if (action === 'tank_deleted') {
        const tankName = details.tankName || details.tankId || '';
        return `Tank '${tankName}'`;
      }
      if (action === 'tank_updated' && details.changes) {
        const nameChange = details.changes.find((c: any) => c.field === 'name');
        if (nameChange) {
          return `Tank '${nameChange.oldValue}' renamed to '${nameChange.newValue}'`;
        }
        const activeChange = details.changes.find((c: any) => c.field === 'isActive');
        if (activeChange) {
          const tankName = nameChange?.newValue || details.tankId || '';
          return `Tank '${tankName}' ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      const tankName = details.tankId || '';
      return `Tank '${tankName}'`;
    }

    // RACK EVENTS
    if (entityType === 'rack') {
      const tankName = details.tankName || details.tankId || '';
      const rackName = details.rackName || `Rack ${details.rackId}` || '';
      const path = `${tankName}/${rackName}`;

      if (action === 'rack_created') {
        return path;
      }
      if (action === 'rack_deleted') {
        return path;
      }
      if (action === 'rack_updated' && details.changes) {
        const nameChange = details.changes.find((c: any) => c.field === 'name');
        if (nameChange) {
          const oldPath = `${tankName}/${nameChange.oldValue}`;
          return `${oldPath} renamed to '${nameChange.newValue}'`;
        }
        const activeChange = details.changes.find((c: any) => c.field === 'isActive');
        if (activeChange) {
          return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      return path;
    }

    // BOX EVENTS
    if (entityType === 'box') {
      const tankName = details.tankName || details.tankId || '';
      const rackName = details.rackName || `Rack ${details.rackId}` || '';
      const boxName = details.boxName || `Box ${details.boxId}` || '';
      const path = `${tankName}/${rackName}/${boxName}`;

      if (action === 'box_created') {
        return path;
      }
      if (action === 'box_deleted') {
        return path;
      }
      if (action === 'box_updated' && details.changes) {
        const nameChange = details.changes.find((c: any) => c.field === 'name');
        if (nameChange) {
          const oldPath = `${tankName}/${rackName}/Box ${nameChange.oldValue}`;
          return `${oldPath} renamed to 'Box ${nameChange.newValue}'`;
        }
        const rowChange = details.changes.find((c: any) => c.field === 'gridConfig.rows');
        const colChange = details.changes.find((c: any) => c.field === 'gridConfig.cols');
        if (rowChange && colChange) {
          return `${path} resized to ${rowChange.newValue}x${colChange.newValue}`;
        }
        const activeChange = details.changes.find((c: any) => c.field === 'isActive');
        if (activeChange) {
          return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      return path;
    }

    // LAB EVENTS
    if (entityType === 'lab') {
      if (action === 'lab_name_changed' && details.oldName && details.newName) {
        return `'${details.oldName}' renamed to '${details.newName}'`;
      }
      return details.newName || '-';
    }

    // RESEARCHER EVENTS
    if (entityType === 'researcher') {
      const researcherName = details.researcherName || '-';
      const createdBy = details.createdBy || '';
      const updatedBy = details.updatedBy || '';
      const deactivatedBy = details.deactivatedBy || '';
      const reactivatedBy = details.reactivatedBy || '';

      if (action === 'researcher_created') {
        const emailPart = details.email ? ` (${details.email})` : '';
        return `${researcherName}${emailPart} by ${createdBy}`;
      }
      if (action === 'researcher_updated' && details.changes) {
        const emailChange = details.changes.find((c: any) => c.field === 'email');
        if (emailChange) {
          return `${researcherName}: Email changed to ${emailChange.newValue} by ${updatedBy}`;
        }
        const positionChange = details.changes.find((c: any) => c.field === 'position');
        if (positionChange) {
          return `${researcherName}: Position changed to '${positionChange.newValue}' by ${updatedBy}`;
        }
        const firstNameChange = details.changes.find((c: any) => c.field === 'firstName');
        const lastNameChange = details.changes.find((c: any) => c.field === 'lastName');
        if (firstNameChange || lastNameChange) {
          return `${researcherName}: Name updated by ${updatedBy}`;
        }
        return `${researcherName} updated by ${updatedBy}`;
      }
      if (action === 'researcher_deactivated') {
        const tubeCount = details.tubesReassignedCount || 0;
        const tubeText = tubeCount > 0 ? ` (${tubeCount} tubes reassigned to Unknown)` : '';
        return `${researcherName}${tubeText} by ${deactivatedBy}`;
      }
      if (action === 'researcher_reactivated') {
        return `${researcherName} by ${reactivatedBy}`;
      }
      return researcherName;
    }

    // USER EVENTS
    if (entityType === 'user') {
      const username = details.username || '-';
      const changedBy = details.changedBy || '';
      const linkedBy = details.linkedBy || '';
      const unlinkedBy = details.unlinkedBy || '';
      const deletedBy = details.deletedBy || '';

      if (action === 'user_created') {
        const role = details.role || 'user';
        const isFirstUser = details.username && username === details.username && !changedBy;
        return isFirstUser ? `${username} (Role: ${role}) - First user setup` : `${username} (Role: ${role})`;
      }
      if (action === 'user_logged_in') {
        return username;
      }
      if (action === 'user_logged_out') {
        return username;
      }
      if (action === 'user_role_changed') {
        const newRole = details.newRole || '';
        return `Role changed to ${newRole}`;
      }
      if (action === 'user_password_changed') {
        return 'Password changed';
      }
      if (action === 'user_linked_to_researcher') {
        const researcherName = details.researcherName || '';
        return `${username} linked to researcher ${researcherName} by ${linkedBy}`;
      }
      if (action === 'user_unlinked_from_researcher') {
        const researcherName = details.researcherName || '';
        return `${username} unlinked from researcher ${researcherName} by ${unlinkedBy}`;
      }
      if (action === 'user_deleted') {
        return `${username} by ${deletedBy}`;
      }
      return username;
    }

    return '-';
  } catch {
    return '-';
  }
}
