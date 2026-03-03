/**
 * Audit Log Formatters Tests
 *
 * Covers all event types, truncation behavior, legacy separator normalization, and edge cases.
 */

import { describe, it, expect } from 'vitest';

import { formatAuditDetails } from './auditLogFormatters';

import type { AuditLogEntry } from '@odysseus/shared-schemas';

/** Helper to build a minimal AuditLogEntry for testing */
function entry(
  action: string,
  entityType: string,
  details: Record<string, unknown>
): AuditLogEntry {
  return {
    id: 'test-id',
    userId: 'user-1',
    username: 'testuser',
    action,
    entityType,
    details: details as unknown as string,
    timestamp: '2026-01-27T12:00:00.000Z',
  };
}

// ── TUBE EVENTS ──

describe('tube events', () => {
  it('tube_created shows location, cell type, and IDs', () => {
    const result = formatAuditDetails(
      entry('tube_created', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · A1',
        cellType: 'iPSC',
        donorInternalId: 'INT-001',
        donorSourceId: 'SRC-001',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · A1 (iPSC, I.ID: INT-001, S.ID: SRC-001)');
  });

  it('tube_created with no sample info shows location only', () => {
    const result = formatAuditDetails(
      entry('tube_created', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · A1',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · A1');
  });

  it('tube_deleted shows same format as tube_created', () => {
    const result = formatAuditDetails(
      entry('tube_deleted', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · B2',
        cellType: 'HEK293',
        donorInternalId: 'INT-002',
        donorSourceId: '',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · B2 (HEK293, I.ID: INT-002)');
  });

  it('tube_updated with changes shows location and changed fields', () => {
    const result = formatAuditDetails(
      entry('tube_updated', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · A1',
        changes: [
          { field: 'cellType', oldValue: 'iPSC', newValue: 'HEK293' },
          { field: 'notes', newValue: 'Updated note' },
        ],
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · A1 — Cell Type, Notes changed');
  });

  it('tube_updated with >3 changes truncates and provides fullText', () => {
    const result = formatAuditDetails(
      entry('tube_updated', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · A1',
        changes: [
          { field: 'cellType', newValue: 'a' },
          { field: 'notes', newValue: 'b' },
          { field: 'lotNumber', newValue: 'c' },
          { field: 'concentration', newValue: 1 },
          { field: 'media', newValue: 'x' },
        ],
      })
    );
    expect(result.text).toContain('+2 more');
    expect(result.fullText).toBeDefined();
    expect(result.fullText).toContain('Media');
    expect(result.fullText).toContain('Concentration');
  });

  it('tube_moved shows old → new location', () => {
    const result = formatAuditDetails(
      entry('tube_moved', 'tube', {
        oldDisplayLocation: 'Tank 1 · Rack A · Box 1 · A1',
        displayLocation: 'Tank 2 · Rack B · Box 2 · C3',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · A1 → Tank 2 · Rack B · Box 2 · C3');
  });

  it('tube_bulk_updated shows summary', () => {
    const result = formatAuditDetails(
      entry('tube_bulk_updated', 'tube', {
        count: 5,
        changesSummary: '5 tubes updated: Cell Type',
      })
    );
    expect(result.text).toBe('5 tubes updated: Cell Type');
  });

  it('tubes_locked shows count and note', () => {
    const result = formatAuditDetails(
      entry('tubes_locked', 'tube', { tubeCount: 3, lockNote: 'QC hold' })
    );
    expect(result.text).toBe('3 tubes locked: "QC hold"');
  });

  it('tubes_unlocked shows count', () => {
    const result = formatAuditDetails(entry('tubes_unlocked', 'tube', { tubeCount: 1 }));
    expect(result.text).toBe('1 tube unlocked');
  });

  it('tube_access_shared with users shows usernames', () => {
    const result = formatAuditDetails(
      entry('tube_access_shared', 'tube', {
        tubeCount: 2,
        sharedWithUsers: [
          { userId: 'u1', username: 'alice' },
          { userId: 'u2', username: 'bob' },
        ],
      })
    );
    expect(result.text).toBe('2 tubes shared with alice, bob');
  });

  it('tube_access_shared with >3 users truncates', () => {
    const result = formatAuditDetails(
      entry('tube_access_shared', 'tube', {
        tubeCount: 5,
        sharedWithUsers: [
          { userId: 'u1', username: 'alice' },
          { userId: 'u2', username: 'bob' },
          { userId: 'u3', username: 'carol' },
          { userId: 'u4', username: 'dave' },
        ],
      })
    );
    expect(result.text).toContain('+1 more');
    expect(result.fullText).toContain('dave');
  });

  it('tube_access_revoked with users shows usernames', () => {
    const result = formatAuditDetails(
      entry('tube_access_revoked', 'tube', {
        tubeCount: 1,
        revokedUsers: [{ userId: 'u1', username: 'alice' }],
      })
    );
    expect(result.text).toBe('1 tube revoked from alice');
  });
});

// ── TANK EVENTS ──

describe('tank events', () => {
  it('tank_created shows tank name', () => {
    const result = formatAuditDetails(entry('tank_created', 'tank', { tankName: 'Tank 1' }));
    expect(result.text).toBe('Tank 1');
  });

  it('tank_updated with name change shows old → new', () => {
    const result = formatAuditDetails(
      entry('tank_updated', 'tank', {
        tankName: 'Tank 1',
        changes: [{ field: 'name', oldValue: 'Tank 1', newValue: 'Main Tank' }],
      })
    );
    expect(result.text).toBe('Tank 1 → Main Tank');
  });

  it('tank_updated with isActive change', () => {
    const result = formatAuditDetails(
      entry('tank_updated', 'tank', {
        tankName: 'Tank 1',
        changes: [{ field: 'isActive', oldValue: true, newValue: false }],
      })
    );
    expect(result.text).toBe('Tank 1 deactivated');
  });
});

// ── RACK EVENTS ──

describe('rack events', () => {
  it('rack_created shows tank · rack path', () => {
    const result = formatAuditDetails(
      entry('rack_created', 'rack', { tankName: 'Tank 1', rackName: 'Rack A' })
    );
    expect(result.text).toBe('Tank 1 · Rack A');
  });

  it('rack_assigned shows assignment', () => {
    const result = formatAuditDetails(
      entry('rack_assigned', 'rack', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        newOwner: { userId: 'u1', username: 'alice' },
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A assigned to alice');
  });

  it('rack_reassigned shows old → new owner', () => {
    const result = formatAuditDetails(
      entry('rack_reassigned', 'rack', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        previousOwner: { userId: 'u1', username: 'alice' },
        newOwner: { userId: 'u2', username: 'bob' },
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A — alice → bob');
  });

  it('rack_label_updated shows label change', () => {
    const result = formatAuditDetails(
      entry('rack_label_updated', 'rack', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        oldLabel: 'Old',
        newLabel: 'New',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A — label Old → New');
  });

  it('rack_label_updated set new label', () => {
    const result = formatAuditDetails(
      entry('rack_label_updated', 'rack', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        oldLabel: null,
        newLabel: 'My Label',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A — label set to My Label');
  });

  it('rack_label_updated removed', () => {
    const result = formatAuditDetails(
      entry('rack_label_updated', 'rack', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        oldLabel: 'Old',
        newLabel: null,
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A — label Old removed');
  });
});

// ── BOX EVENTS ──

describe('box events', () => {
  it('box_created shows full path', () => {
    const result = formatAuditDetails(
      entry('box_created', 'box', { tankName: 'Tank 1', rackName: 'Rack A', boxName: 'Box 1' })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1');
  });

  it('box_updated with grid resize', () => {
    const result = formatAuditDetails(
      entry('box_updated', 'box', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        boxName: 'Box 1',
        changes: [
          { field: 'gridConfig.rows', oldValue: 9, newValue: 10 },
          { field: 'gridConfig.cols', oldValue: 9, newValue: 10 },
        ],
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 resized to 10x10');
  });

  it('box_assigned shows assignment', () => {
    const result = formatAuditDetails(
      entry('box_assigned', 'box', {
        tankName: 'Tank 1',
        rackName: 'Rack A',
        boxName: 'Box 1',
        newOwner: { userId: 'u1', username: 'alice' },
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 assigned to alice');
  });
});

// ── LAB EVENTS ──

describe('lab events', () => {
  it('lab_name_changed shows old → new', () => {
    const result = formatAuditDetails(
      entry('lab_name_changed', 'lab', { oldName: 'Lab A', newName: 'Lab B' })
    );
    expect(result.text).toBe('Lab A → Lab B');
  });
});

// ── RESEARCHER EVENTS ──

describe('researcher events', () => {
  it('researcher_created shows name and email', () => {
    const result = formatAuditDetails(
      entry('researcher_created', 'researcher', {
        researcherName: 'Jane Doe',
        email: 'jane@lab.com',
      })
    );
    expect(result.text).toBe('Jane Doe (jane@lab.com)');
  });

  it('researcher_updated shows changes', () => {
    const result = formatAuditDetails(
      entry('researcher_updated', 'researcher', {
        researcherName: 'Jane Doe',
        changes: [
          { field: 'email', oldValue: 'old@lab.com', newValue: 'new@lab.com' },
          { field: 'position', oldValue: 'Postdoc', newValue: 'PI' },
        ],
      })
    );
    expect(result.text).toBe('Jane Doe — Email → new@lab.com, Position → PI');
  });

  it('researcher_deactivated shows tube count', () => {
    const result = formatAuditDetails(
      entry('researcher_deactivated', 'researcher', {
        researcherName: 'Jane Doe',
        tubeCount: 15,
      })
    );
    expect(result.text).toBe('Jane Doe (15 tubes in stock)');
  });

  it('researcher_reactivated shows name', () => {
    const result = formatAuditDetails(
      entry('researcher_reactivated', 'researcher', { researcherName: 'Jane Doe' })
    );
    expect(result.text).toBe('Jane Doe');
  });

  it('researcher_deleted shows name', () => {
    const result = formatAuditDetails(
      entry('researcher_deleted', 'researcher', { researcherName: 'Jane Doe' })
    );
    expect(result.text).toBe('Jane Doe');
  });
});

// ── USER EVENTS ──

describe('user events', () => {
  it('user_created shows username and role', () => {
    const result = formatAuditDetails(
      entry('user_created', 'user', { username: 'alice', role: 'admin', changedBy: 'admin' })
    );
    expect(result.text).toBe('alice (admin)');
  });

  it('user_created first user shows setup note', () => {
    const result = formatAuditDetails(
      entry('user_created', 'user', { username: 'admin', role: 'admin' })
    );
    expect(result.text).toBe('admin (admin) — first user setup');
  });

  it('user_logged_in shows username', () => {
    const result = formatAuditDetails(entry('user_logged_in', 'user', { username: 'alice' }));
    expect(result.text).toBe('alice');
  });

  it('user_role_changed shows old → new role', () => {
    const result = formatAuditDetails(
      entry('user_role_changed', 'user', { username: 'alice', oldRole: 'user', newRole: 'admin' })
    );
    expect(result.text).toBe('user → admin');
  });

  it('user_password_changed', () => {
    const result = formatAuditDetails(
      entry('user_password_changed', 'user', { username: 'alice' })
    );
    expect(result.text).toBe('Password changed');
  });

  it('user_approved', () => {
    const result = formatAuditDetails(entry('user_approved', 'user', { username: 'alice' }));
    expect(result.text).toBe('alice approved');
  });

  it('user_linked_to_researcher', () => {
    const result = formatAuditDetails(
      entry('user_linked_to_researcher', 'user', {
        username: 'alice',
        researcherName: 'Jane Doe',
      })
    );
    expect(result.text).toBe('alice linked to Jane Doe');
  });

  it('user_unlinked_from_researcher', () => {
    const result = formatAuditDetails(
      entry('user_unlinked_from_researcher', 'user', {
        username: 'alice',
        researcherName: 'Jane Doe',
      })
    );
    expect(result.text).toBe('alice unlinked from Jane Doe');
  });

  it('user_deleted shows username', () => {
    const result = formatAuditDetails(entry('user_deleted', 'user', { username: 'alice' }));
    expect(result.text).toBe('alice');
  });
});

// ── CONFIGURATION (BULK) EVENTS ──

describe('configuration events', () => {
  it('resources_bulk_unassigned shows summary', () => {
    const result = formatAuditDetails(
      entry('resources_bulk_unassigned', 'configuration', {
        fromUser: { userId: 'u1', username: 'alice' },
        racksAffected: 2,
        boxesAffected: 5,
      })
    );
    expect(result.text).toBe('2 racks, 5 boxes unassigned from alice');
  });

  it('resources_bulk_reassigned shows old → new', () => {
    const result = formatAuditDetails(
      entry('resources_bulk_reassigned', 'configuration', {
        fromUser: { userId: 'u1', username: 'alice' },
        toUser: { userId: 'u2', username: 'bob' },
        racksAffected: 1,
        boxesAffected: 3,
      })
    );
    expect(result.text).toBe('1 rack, 3 boxes — alice → bob');
  });
});

// ── LEGACY SEPARATOR NORMALIZATION ──

describe('legacy separator normalization', () => {
  it('converts / separators to · in display locations', () => {
    const result = formatAuditDetails(
      entry('tube_created', 'tube', {
        displayLocation: 'Tank 1 / Rack A / Box 1 / A1',
        cellType: 'iPSC',
      })
    );
    expect(result.text).toBe('Tank 1 · Rack A · Box 1 · A1 (iPSC)');
    expect(result.text).not.toContain(' / ');
  });

  it('converts / separators in tube_moved old and new locations', () => {
    const result = formatAuditDetails(
      entry('tube_moved', 'tube', {
        oldDisplayLocation: 'Tank 1 / Rack A / Box 1 / A1',
        displayLocation: 'Tank 2 / Rack B / Box 2 / C3',
      })
    );
    expect(result.text).not.toContain(' / ');
    expect(result.text).toContain(' · ');
  });
});

// ── EDGE CASES ──

describe('edge cases', () => {
  it('returns dash for unknown entity type', () => {
    const result = formatAuditDetails(entry('some_action', 'unknown', {}));
    expect(result.text).toBe('-');
  });

  it('handles null/undefined details gracefully', () => {
    const e: AuditLogEntry = {
      id: 'test',
      userId: 'u1',
      username: 'test',
      action: 'tube_created',
      entityType: 'tube',
      details: null as unknown as string,
      timestamp: '2026-01-27T12:00:00.000Z',
    };
    const result = formatAuditDetails(e);
    expect(result.text).toBe('-');
  });

  it('handles string JSON details', () => {
    const e: AuditLogEntry = {
      id: 'test',
      userId: 'u1',
      username: 'test',
      action: 'tank_created',
      entityType: 'tank',
      details: JSON.stringify({ tankName: 'Tank 1' }),
      timestamp: '2026-01-27T12:00:00.000Z',
    };
    const result = formatAuditDetails(e);
    expect(result.text).toBe('Tank 1');
  });

  it('handles malformed JSON string gracefully', () => {
    const e: AuditLogEntry = {
      id: 'test',
      userId: 'u1',
      username: 'test',
      action: 'tube_created',
      entityType: 'tube',
      details: '{invalid json' as string,
      timestamp: '2026-01-27T12:00:00.000Z',
    };
    const result = formatAuditDetails(e);
    expect(result.text).toBe('-');
  });

  it('change record with only newValue (no oldValue) is recognized', () => {
    const result = formatAuditDetails(
      entry('tube_updated', 'tube', {
        displayLocation: 'Tank 1 · Rack A · Box 1 · A1',
        changes: [{ field: 'cellType', newValue: 'iPSC' }],
      })
    );
    expect(result.text).toContain('Cell Type');
  });

  it('singular count forms', () => {
    const locked = formatAuditDetails(entry('tubes_locked', 'tube', { tubeCount: 1 }));
    expect(locked.text).toBe('1 tube locked');

    const config = formatAuditDetails(
      entry('resources_bulk_unassigned', 'configuration', {
        fromUser: { username: 'alice' },
        racksAffected: 1,
        boxesAffected: 1,
      })
    );
    expect(config.text).toBe('1 rack, 1 box unassigned from alice');
  });
});
