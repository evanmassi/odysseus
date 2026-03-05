/**
 * Audit Log Formatters
 *
 * Formats audit log entry details for display with consistent separators:
 *   · (center dot) for location paths
 *   — (em dash) for separating location from change details
 *   → (arrow) for before/after transitions
 *   : (colon) after subject names or counts
 *   , (comma) for listing multiple items
 *   () for parenthetical metadata
 */

import type { AuditLogEntry } from '@odysseus/shared-schemas';

interface AuditChangeRecord {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

function isAuditChangeRecord(value: unknown): value is AuditChangeRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof (value as Record<string, unknown>)['field'] === 'string' &&
    ('oldValue' in value || 'newValue' in value)
  );
}

function hasChangesArray(
  details: unknown
): details is { changes: unknown[] } & Record<string, unknown> {
  return (
    typeof details === 'object' &&
    details !== null &&
    'changes' in details &&
    Array.isArray((details as Record<string, unknown>)['changes'])
  );
}

function parseAuditDetailsJson(details: unknown): Record<string, unknown> {
  try {
    if (typeof details === 'object' && details !== null) {
      return details as Record<string, unknown>;
    }
    if (typeof details === 'string' && details.length > 0) {
      const parsed: unknown = JSON.parse(details);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    }
    return {};
  } catch {
    return {};
  }
}

function getStringProperty(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  return typeof value === 'string' ? value : '';
}

function getNumberProperty(details: Record<string, unknown>, key: string): number {
  const value = details[key];
  return typeof value === 'number' ? value : 0;
}

function findChangeByField(
  details: Record<string, unknown>,
  fieldName: string
): AuditChangeRecord | undefined {
  if (!hasChangesArray(details)) {
    return undefined;
  }
  return details.changes.filter(isAuditChangeRecord).find(change => change.field === fieldName);
}

function getAllChanges(details: Record<string, unknown>): AuditChangeRecord[] {
  if (!hasChangesArray(details)) {
    return [];
  }
  return details.changes.filter(isAuditChangeRecord);
}

const FIELD_LABELS: Record<string, string> = {
  cellType: 'Cell Type',
  donorInternalId: 'Internal ID',
  donorSourceId: 'Source ID',
  concentration: 'Concentration',
  concentrationUnit: 'Concentration Unit',
  media: 'Media',
  media_type: 'Media Type',
  media_supplements: 'Media Supplements',
  media_selection: 'Media Selection',
  cultureCondition: 'Culture Condition',
  lotNumber: 'Lot Number',
  notes: 'Notes',
  date: 'Date',
  location: 'Location',
  passage: 'Passage',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  position: 'Position',
  name: 'Name',
  isActive: 'Active Status',
  'gridConfig.rows': 'Grid Rows',
  'gridConfig.cols': 'Grid Columns',
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System Admin',
  lab_admin: 'Lab Admin',
  user: 'User',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// Converts legacy " / " separators to " · "
function normalizeLocation(location: string): string {
  return location.split(' / ').join(' · ');
}

function getLocation(details: Record<string, unknown>): string {
  const display = getStringProperty(details, 'displayLocation');
  if (display) return normalizeLocation(display);
  const raw = getStringProperty(details, 'location');
  if (raw) return raw;
  return '';
}

function storagePath(...parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

function formatChangedFields(changes: AuditChangeRecord[]): { text: string; full?: string } {
  const labels = changes.map(c => getFieldLabel(c.field));
  if (labels.length <= 3) return { text: labels.join(', ') };
  return {
    text: `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`,
    full: labels.join(', '),
  };
}

function formatUserList(users: unknown[]): { text: string; full?: string } {
  const names = users
    .filter(
      (u): u is { username: string } =>
        typeof u === 'object' &&
        u !== null &&
        'username' in u &&
        typeof (u as Record<string, unknown>)['username'] === 'string'
    )
    .map(u => u.username);

  if (names.length === 0) return { text: 'unknown' };
  if (names.length <= 3) return { text: names.join(', ') };
  return {
    text: `${names.slice(0, 3).join(', ')} +${names.length - 3} more`,
    full: names.join(', '),
  };
}

export interface AuditDetailFormatted {
  text: string;
  /** Only set when content was truncated */
  fullText?: string;
}

export function formatAuditDetails(entry: AuditLogEntry): AuditDetailFormatted {
  const plain = (text: string): AuditDetailFormatted => ({ text });

  try {
    const details = parseAuditDetailsJson(entry.details);
    const action = entry.action;
    const entityType = entry.entityType;

    // ── TUBE EVENTS ──

    if (entityType === 'tube') {
      if (action === 'tube_bulk_updated') {
        const count = getNumberProperty(details, 'count');
        const summary = getStringProperty(details, 'changesSummary');
        if (count > 0) {
          return plain(summary || `${count} tube${count !== 1 ? 's' : ''} updated`);
        }
      }

      if (action === 'tubes_locked') {
        const count = getNumberProperty(details, 'tubeCount');
        const lockNote = getStringProperty(details, 'lockNote');
        const noteText = lockNote ? `: "${lockNote}"` : '';
        return plain(`${count} tube${count !== 1 ? 's' : ''} locked${noteText}`);
      }

      if (action === 'tubes_unlocked') {
        const count = getNumberProperty(details, 'tubeCount');
        return plain(`${count} tube${count !== 1 ? 's' : ''} unlocked`);
      }

      if (action === 'tube_access_shared') {
        const tubeCount = getNumberProperty(details, 'tubeCount');
        const sharedUsers = details['sharedWithUsers'];
        if (Array.isArray(sharedUsers)) {
          const users = formatUserList(sharedUsers);
          const prefix = `${tubeCount} tube${tubeCount !== 1 ? 's' : ''} shared with`;
          return {
            text: `${prefix} ${users.text}`,
            fullText: users.full ? `${prefix} ${users.full}` : undefined,
          };
        }
        return plain(
          `${tubeCount} tube${tubeCount !== 1 ? 's' : ''} shared with ${getNumberProperty(details, 'sharedWithCount')} user(s)`
        );
      }

      if (action === 'tube_access_revoked') {
        const tubeCount = getNumberProperty(details, 'tubeCount');
        const revokedUsers = details['revokedUsers'];
        if (Array.isArray(revokedUsers)) {
          const users = formatUserList(revokedUsers);
          const prefix = `${tubeCount} tube${tubeCount !== 1 ? 's' : ''} revoked from`;
          return {
            text: `${prefix} ${users.text}`,
            fullText: users.full ? `${prefix} ${users.full}` : undefined,
          };
        }
        return plain(
          `${tubeCount} tube${tubeCount !== 1 ? 's' : ''} revoked from ${getNumberProperty(details, 'revokedCount')} user(s)`
        );
      }

      if (action === 'tube_moved') {
        const oldLoc =
          getStringProperty(details, 'oldDisplayLocation') ||
          getStringProperty(details, 'oldLocation');
        const newLoc =
          getStringProperty(details, 'displayLocation') ||
          getStringProperty(details, 'newLocation');
        if (oldLoc && newLoc) {
          return plain(`${normalizeLocation(oldLoc)} → ${normalizeLocation(newLoc)}`);
        }
      }

      if (action === 'tube_updated') {
        const location = getLocation(details);
        const changes = getAllChanges(details);
        if (changes.length > 0) {
          const fields = formatChangedFields(changes);
          const text = location ? `${location} — ${fields.text} changed` : `${fields.text} changed`;
          const fullText = fields.full
            ? location
              ? `${location} — ${fields.full} changed`
              : `${fields.full} changed`
            : undefined;
          return { text, fullText };
        }
        return plain(location || '-');
      }

      if (action === 'tube_created' || action === 'tube_deleted') {
        const location = getLocation(details);
        const cellType = getStringProperty(details, 'cellType');
        const internalId = getStringProperty(details, 'donorInternalId');
        const sourceId = getStringProperty(details, 'donorSourceId');
        const infoParts: string[] = [];
        if (cellType) infoParts.push(cellType);
        if (internalId) infoParts.push(`I.ID: ${internalId}`);
        if (sourceId) infoParts.push(`S.ID: ${sourceId}`);
        const infoSuffix = infoParts.length > 0 ? ` (${infoParts.join(', ')})` : '';
        return plain(location ? `${location}${infoSuffix}` : '-');
      }

      // Fallback for any other tube action
      const location = getLocation(details);
      return plain(location || '-');
    }

    // ── TANK EVENTS ──

    if (entityType === 'tank') {
      const tankName =
        getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';

      if (action === 'tank_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          return plain(`${nameChange.oldValue} → ${nameChange.newValue}`);
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          return plain(`${tankName} ${activeChange.newValue ? 'activated' : 'deactivated'}`);
        }
        const changes = getAllChanges(details);
        if (changes.length > 0) {
          const fields = formatChangedFields(changes);
          return {
            text: `${tankName} — ${fields.text} changed`,
            fullText: fields.full ? `${tankName} — ${fields.full} changed` : undefined,
          };
        }
      }

      return plain(tankName);
    }

    // ── RACK EVENTS ──

    if (entityType === 'rack') {
      const tankName =
        getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
      const rackName =
        getStringProperty(details, 'rackName') || getStringProperty(details, 'rackId') || '';
      const path = storagePath(tankName, rackName);

      if (action === 'rack_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          return plain(
            `${storagePath(tankName, String(nameChange.oldValue))} → ${nameChange.newValue}`
          );
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          return plain(`${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`);
        }
        const changes = getAllChanges(details);
        if (changes.length > 0) {
          const fields = formatChangedFields(changes);
          return {
            text: `${path} — ${fields.text} changed`,
            fullText: fields.full ? `${path} — ${fields.full} changed` : undefined,
          };
        }
      }

      if (action === 'rack_label_updated') {
        const oldLabel = details['oldLabel'] as string | null;
        const newLabel = details['newLabel'] as string | null;
        if (oldLabel && newLabel) {
          return plain(`${path} — label ${oldLabel} → ${newLabel}`);
        } else if (newLabel) {
          return plain(`${path} — label set to ${newLabel}`);
        } else if (oldLabel) {
          return plain(`${path} — label ${oldLabel} removed`);
        }
        return plain(path);
      }

      if (action === 'rack_assigned') {
        const newOwner = details['newOwner'] as { username?: string } | null;
        return plain(`${path} assigned to ${newOwner?.username ?? 'user'}`);
      }
      if (action === 'rack_unassigned') {
        const previousOwner = details['previousOwner'] as { username?: string } | null;
        return plain(`${path} unassigned from ${previousOwner?.username ?? 'user'}`);
      }
      if (action === 'rack_reassigned') {
        const previousOwner = details['previousOwner'] as { username?: string } | null;
        const newOwner = details['newOwner'] as { username?: string } | null;
        return plain(
          `${path} — ${previousOwner?.username ?? 'user'} → ${newOwner?.username ?? 'user'}`
        );
      }

      return plain(path);
    }

    // ── BOX EVENTS ──

    if (entityType === 'box') {
      const tankName =
        getStringProperty(details, 'tankName') || getStringProperty(details, 'tankId') || '';
      const rackName =
        getStringProperty(details, 'rackName') || getStringProperty(details, 'rackId') || '';
      const boxName =
        getStringProperty(details, 'boxName') || getStringProperty(details, 'boxId') || '';
      const path = storagePath(tankName, rackName, boxName);

      if (action === 'box_updated') {
        const nameChange = findChangeByField(details, 'name');
        if (nameChange) {
          return plain(
            `${storagePath(tankName, rackName, String(nameChange.oldValue))} → ${nameChange.newValue}`
          );
        }
        const rowChange = findChangeByField(details, 'gridConfig.rows');
        const colChange = findChangeByField(details, 'gridConfig.cols');
        if (rowChange && colChange) {
          return plain(`${path} resized to ${rowChange.newValue}x${colChange.newValue}`);
        }
        const activeChange = findChangeByField(details, 'isActive');
        if (activeChange) {
          return plain(`${path} ${activeChange.newValue ? 'activated' : 'deactivated'}`);
        }
        const changes = getAllChanges(details);
        if (changes.length > 0) {
          const fields = formatChangedFields(changes);
          return {
            text: `${path} — ${fields.text} changed`,
            fullText: fields.full ? `${path} — ${fields.full} changed` : undefined,
          };
        }
      }

      if (action === 'box_label_updated') {
        const oldLabel = details['oldLabel'] as string | null;
        const newLabel = details['newLabel'] as string | null;
        if (oldLabel && newLabel) {
          return plain(`${path} — label ${oldLabel} → ${newLabel}`);
        } else if (newLabel) {
          return plain(`${path} — label set to ${newLabel}`);
        } else if (oldLabel) {
          return plain(`${path} — label ${oldLabel} removed`);
        }
        return plain(path);
      }

      if (action === 'box_assigned') {
        const newOwner = details['newOwner'] as { username?: string } | null;
        return plain(`${path} assigned to ${newOwner?.username ?? 'user'}`);
      }
      if (action === 'box_unassigned') {
        const previousOwner = details['previousOwner'] as { username?: string } | null;
        return plain(`${path} unassigned from ${previousOwner?.username ?? 'user'}`);
      }
      if (action === 'box_reassigned') {
        const previousOwner = details['previousOwner'] as { username?: string } | null;
        const newOwner = details['newOwner'] as { username?: string } | null;
        return plain(
          `${path} — ${previousOwner?.username ?? 'user'} → ${newOwner?.username ?? 'user'}`
        );
      }

      return plain(path);
    }

    // ── LAB EVENTS ──

    if (entityType === 'lab') {
      if (action === 'lab_created') {
        return plain(getStringProperty(details, 'labName') || '-');
      }
      if (action === 'invite_code_created') {
        return plain('Invite code created');
      }
      if (action === 'invite_code_used') {
        return plain('Invite code redeemed');
      }
      const oldName = getStringProperty(details, 'oldName');
      const newName = getStringProperty(details, 'newName');
      if (action === 'lab_name_changed' && oldName && newName) {
        return plain(`${oldName} → ${newName}`);
      }
      return plain(newName || '-');
    }

    // ── RESEARCHER EVENTS ──

    if (entityType === 'researcher') {
      const researcherName = getStringProperty(details, 'researcherName') || '-';

      if (action === 'researcher_created') {
        const email = getStringProperty(details, 'email');
        return plain(email ? `${researcherName} (${email})` : researcherName);
      }

      if (action === 'researcher_updated') {
        const changes = getAllChanges(details);
        if (changes.length > 0) {
          const parts: string[] = [];
          for (const change of changes) {
            if (change.field === 'firstName' || change.field === 'lastName') {
              if (!parts.includes('Name updated')) parts.push('Name updated');
            } else if (change.field === 'email') {
              parts.push(`Email → ${change.newValue}`);
            } else if (change.field === 'position') {
              parts.push(`Position → ${change.newValue}`);
            } else {
              parts.push(`${getFieldLabel(change.field)} changed`);
            }
          }
          return plain(`${researcherName} — ${parts.join(', ')}`);
        }
        return plain(`${researcherName} updated`);
      }

      if (action === 'researcher_deactivated') {
        const tubeCount = getNumberProperty(details, 'tubeCount');
        const tubeText = tubeCount > 0 ? ` (${tubeCount} tubes in stock)` : '';
        return plain(`${researcherName}${tubeText}`);
      }

      if (action === 'researcher_approved') {
        return plain(researcherName);
      }

      return plain(researcherName);
    }

    // ── USER EVENTS ──

    if (entityType === 'user') {
      const username = getStringProperty(details, 'username') || '-';
      const changedBy = getStringProperty(details, 'changedBy');

      if (action === 'user_created') {
        const role = getStringProperty(details, 'role') || 'user';
        const roleLabel = getRoleLabel(role);
        const isFirstUser = username !== '-' && !changedBy;
        return plain(
          isFirstUser
            ? `${username} (${roleLabel}) — first user setup`
            : `${username} (${roleLabel})`
        );
      }
      if (action === 'user_logged_in' || action === 'user_logged_out') {
        return plain(username);
      }
      if (action === 'user_role_changed') {
        const oldRole = getStringProperty(details, 'oldRole');
        const newRole = getStringProperty(details, 'newRole');
        return plain(
          oldRole
            ? `${username} — ${getRoleLabel(oldRole)} → ${getRoleLabel(newRole)}`
            : `${username} — Role → ${getRoleLabel(newRole)}`
        );
      }
      if (action === 'user_password_changed') {
        return plain(`${username} — Password changed`);
      }
      if (action === 'user_approved') {
        return plain(`${username} approved`);
      }
      if (action === 'user_linked_to_researcher') {
        const researcherName = getStringProperty(details, 'researcherName');
        return plain(`${username} linked to ${researcherName}`);
      }
      if (action === 'user_unlinked_from_researcher') {
        const researcherName = getStringProperty(details, 'researcherName');
        return plain(`${username} unlinked from ${researcherName}`);
      }
      if (action === 'user_deactivated' || action === 'user_suspended') {
        return plain(username);
      }
      if (action === 'user_reactivated') {
        const previousStatus = getStringProperty(details, 'previousStatus');
        return plain(previousStatus ? `${username} (was ${previousStatus})` : username);
      }
      if (action === 'user_rejected') {
        return plain(`${username} rejected`);
      }

      return plain(username);
    }

    // ── BULK CONFIGURATION EVENTS ──

    if (entityType === 'configuration') {
      const fromUser = details['fromUser'] as { username?: string } | null;
      const toUser = details['toUser'] as { username?: string } | null;
      const racksAffected = getNumberProperty(details, 'racksAffected');
      const boxesAffected = getNumberProperty(details, 'boxesAffected');
      const resourceSummary = `${racksAffected} rack${racksAffected !== 1 ? 's' : ''}, ${boxesAffected} box${boxesAffected !== 1 ? 'es' : ''}`;

      if (action === 'resources_bulk_unassigned') {
        return plain(`${resourceSummary} unassigned from ${fromUser?.username ?? 'user'}`);
      }
      if (action === 'resources_bulk_reassigned') {
        return plain(
          `${resourceSummary} — ${fromUser?.username ?? 'user'} → ${toUser?.username ?? 'user'}`
        );
      }
      return plain(resourceSummary);
    }

    return plain('-');
  } catch {
    return plain('-');
  }
}
