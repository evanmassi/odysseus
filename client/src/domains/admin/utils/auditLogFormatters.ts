/**
 * Audit Log Formatters
 *
 * Utility functions for formatting audit log entry details for display.
 * Extracts formatting logic from AuditLogViewer component.
 */

import type { AuditLogEntry } from '@odysseus/shared-schemas';

/**
 * Type Definitions for Parsed Audit Log Details
 */

/**
 * Represents a single change record in audit logs
 */
interface AuditChangeRecord {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Type guard to validate if an unknown value is an AuditChangeRecord
 */
function isAuditChangeRecord(value: unknown): value is AuditChangeRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof (value as Record<string, unknown>)['field'] === 'string' &&
    'oldValue' in value &&
    'newValue' in value
  );
}

/**
 * Type guard to check if parsed details has a changes array
 */
function hasChangesArray(details: unknown): details is { changes: unknown[] } & Record<string, unknown> {
  return (
    typeof details === 'object' &&
    details !== null &&
    'changes' in details &&
    Array.isArray((details as Record<string, unknown>)['changes'])
  );
}

/**
 * Safely parse audit log details JSON string
 * Returns an object or empty object on parse failure
 */
function parseAuditDetailsJson(detailsJson: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(detailsJson);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Safely get a string property from details object
 */
function getStringProperty(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Safely get a number property from details object
 */
function getNumberProperty(details: Record<string, unknown>, key: string): number {
  const value = details[key];
  return typeof value === 'number' ? value : 0;
}

/**
 * Find a change record by field name from a validated changes array
 */
function findChangeByField(
  details: Record<string, unknown>,
  fieldName: string
): AuditChangeRecord | undefined {
  if (!hasChangesArray(details)) {
    return undefined;
  }

  return details.changes
    .filter(isAuditChangeRecord)
    .find((change) => change.field === fieldName);
}

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
    const details = parseAuditDetailsJson(entry.details);
    const action = entry.action;
    const entityType = entry.entityType;

    // TUBES: Show location or bulk update count
    if (entityType === 'tube') {
      if (action === 'tube_bulk_updated') {
        const count = getNumberProperty(details, 'count');
        if (count > 0) {
          return `${count} tube${count !== 1 ? 's' : ''} updated`;
        }
      }
      const displayLocation = getStringProperty(details, 'displayLocation');
      if (displayLocation) return displayLocation;
      const location = getStringProperty(details, 'location');
      if (location) return location;
      return '-';
    }

    // TANK EVENTS
    if (entityType === 'tank') {
      if (action === 'tank_created') {
        const tankName = getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
        return `Tank '${tankName}'`;
      }
      if (action === 'tank_deleted') {
        const tankName = getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
        return `Tank '${tankName}'`;
      }
      if (action === 'tank_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          return `Tank '${nameChange.oldValue}' renamed to '${nameChange.newValue}'`;
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          const tankName = getStringProperty(details, 'tankId') || '';
          return `Tank '${tankName}' ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      const tankName = getStringProperty(details, 'tankId') || '';
      return `Tank '${tankName}'`;
    }

    // RACK EVENTS
    if (entityType === 'rack') {
      const tankName = getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
      const rackName = getStringProperty(details, 'rackName') || `Rack ${getStringProperty(details, 'rackId')}` || '';
      const path = `${tankName}/${rackName}`;

      if (action === 'rack_created') {
        return path;
      }
      if (action === 'rack_deleted') {
        return path;
      }
      if (action === 'rack_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          const oldPath = `${tankName}/${nameChange.oldValue}`;
          return `${oldPath} renamed to '${nameChange.newValue}'`;
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      return path;
    }

    // BOX EVENTS
    if (entityType === 'box') {
      const tankName = getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
      const rackName = getStringProperty(details, 'rackName') || `Rack ${getStringProperty(details, 'rackId')}` || '';
      const boxName = getStringProperty(details, 'boxName') || `Box ${getStringProperty(details, 'boxId')}` || '';
      const path = `${tankName}/${rackName}/${boxName}`;

      if (action === 'box_created') {
        return path;
      }
      if (action === 'box_deleted') {
        return path;
      }
      if (action === 'box_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          const oldPath = `${tankName}/${rackName}/Box ${nameChange.oldValue}`;
          return `${oldPath} renamed to 'Box ${nameChange.newValue}'`;
        }
        const rowChange = findChangeByField(details, 'gridConfig.rows');
        const colChange = findChangeByField(details, 'gridConfig.cols');
        if (rowChange && colChange) {
          return `${path} resized to ${rowChange.newValue}x${colChange.newValue}`;
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          return `${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`;
        }
      }
      return path;
    }

    // LAB EVENTS
    if (entityType === 'lab') {
      const oldName = getStringProperty(details, 'oldName');
      const newName = getStringProperty(details, 'newName');
      if (action === 'lab_name_changed' && oldName && newName) {
        return `'${oldName}' renamed to '${newName}'`;
      }
      return newName || '-';
    }

    // RESEARCHER EVENTS
    if (entityType === 'researcher') {
      const researcherName = getStringProperty(details, 'researcherName') || '-';
      const createdBy = getStringProperty(details, 'createdBy');
      const updatedBy = getStringProperty(details, 'updatedBy');
      const deactivatedBy = getStringProperty(details, 'deactivatedBy');
      const reactivatedBy = getStringProperty(details, 'reactivatedBy');

      if (action === 'researcher_created') {
        const email = getStringProperty(details, 'email');
        const emailPart = email ? ` (${email})` : '';
        return `${researcherName}${emailPart} by ${createdBy}`;
      }
      if (action === 'researcher_updated') {
        const emailChange = findChangeByField(details, 'email');
        if (emailChange) {
          return `${researcherName}: Email changed to ${emailChange.newValue} by ${updatedBy}`;
        }
        const positionChange = findChangeByField(details, 'position');
        if (positionChange) {
          return `${researcherName}: Position changed to '${positionChange.newValue}' by ${updatedBy}`;
        }
        const firstNameChange = findChangeByField(details, 'firstName');
        const lastNameChange = findChangeByField(details, 'lastName');
        if (firstNameChange || lastNameChange) {
          return `${researcherName}: Name updated by ${updatedBy}`;
        }
        return `${researcherName} updated by ${updatedBy}`;
      }
      if (action === 'researcher_deactivated') {
        const tubeCount = getNumberProperty(details, 'tubesReassignedCount');
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
      const username = getStringProperty(details, 'username') || '-';
      const changedBy = getStringProperty(details, 'changedBy');
      const linkedBy = getStringProperty(details, 'linkedBy');
      const unlinkedBy = getStringProperty(details, 'unlinkedBy');
      const deletedBy = getStringProperty(details, 'deletedBy');

      if (action === 'user_created') {
        const role = getStringProperty(details, 'role') || 'user';
        const isFirstUser = username !== '-' && !changedBy;
        return isFirstUser ? `${username} (Role: ${role}) - First user setup` : `${username} (Role: ${role})`;
      }
      if (action === 'user_logged_in') {
        return username;
      }
      if (action === 'user_logged_out') {
        return username;
      }
      if (action === 'user_role_changed') {
        const newRole = getStringProperty(details, 'newRole');
        return `Role changed to ${newRole}`;
      }
      if (action === 'user_password_changed') {
        return 'Password changed';
      }
      if (action === 'user_linked_to_researcher') {
        const researcherName = getStringProperty(details, 'researcherName');
        return `${username} linked to researcher ${researcherName} by ${linkedBy}`;
      }
      if (action === 'user_unlinked_from_researcher') {
        const researcherName = getStringProperty(details, 'researcherName');
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
