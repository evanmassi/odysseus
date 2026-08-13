/**
 * Demo Guard Tests
 *
 * These guards are the only thing between an anonymous visitor and the demo lab's data, so the
 * no-op path for real labs matters as much as the rejection path — a regression there would
 * start blocking paying customers rather than merely letting a visitor delete a fake tube.
 */

import { ReagentItem } from '@domain/entities/ReagentItem';
import { Tube } from '@domain/entities/Tube';
import type { User } from '@domain/entities/User';
import { PermissionError } from '@domain/errors/PermissionError';

import { rejectSeededItemDeletion } from './DemoGuards';

const demoUser = { isDemo: true } as unknown as User;
const realUser = { isDemo: false } as unknown as User;

describe('rejectSeededItemDeletion', () => {
  it('refuses a seeded record for a demo user', () => {
    expect(() => rejectSeededItemDeletion(demoUser, { isSeeded: true }, 'tube')).toThrow(
      PermissionError
    );
  });

  it('names the demo as the reason rather than reading as a permission failure', () => {
    expect(() => rejectSeededItemDeletion(demoUser, { isSeeded: true }, 'reagent')).toThrow(
      /demo dataset/
    );
  });

  it('labels the record the caller is deleting, not the record carrying the flag', () => {
    expect(() => rejectSeededItemDeletion(demoUser, { isSeeded: true }, 'barcode')).toThrow(
      /This barcode/
    );
  });

  it('allows a demo user to delete their own record', () => {
    expect(() => rejectSeededItemDeletion(demoUser, { isSeeded: false }, 'tube')).not.toThrow();
  });

  it('treats an absent flag as not seeded', () => {
    expect(() => rejectSeededItemDeletion(demoUser, {}, 'tube')).not.toThrow();
  });

  it('never blocks a real lab, even on a seeded record', () => {
    expect(() => rejectSeededItemDeletion(realUser, { isSeeded: true }, 'tube')).not.toThrow();
  });
});

/**
 * The guard is only as good as the flag it reads. Visitors may edit seeded records freely, so an
 * edit that dropped the flag would leave the record deletable with no visible sign anything changed.
 */
describe('isSeeded survives the edits a visitor is allowed to make', () => {
  const seededTube = (): Tube =>
    Tube.fromData({
      id: 'tube_demo0001',
      location: { tankId: 'tank_1', rackId: 'rack_1', boxId: 'A', position: 1 },
      sample: { cellType: 'HeLa' },
      timestamps: { createdAt: new Date(), updatedAt: new Date() },
      labId: 'lab_demo',
      isSeeded: true,
    });

  const seededReagent = (): ReagentItem =>
    ReagentItem.fromData({
      id: 'ritm_demo0001',
      labId: 'lab_demo',
      categoryId: 'rcat_1',
      name: 'Anti-CD3',
      status: 'active',
      isSeeded: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('survives a tube edit', () => {
    expect(seededTube().update({ sample: { cellType: 'iPSC' } }).isSeeded).toBe(true);
  });

  it('survives a tube move', () => {
    const moved = seededTube().update({ location: { position: 5 } });
    expect(moved.isSeeded).toBe(true);
  });

  it('survives locking and unlocking', () => {
    expect(seededTube().lock('user_1').unlock().isSeeded).toBe(true);
  });

  it('survives sharing and revoking access', () => {
    const shared = seededTube().shareWith(['user_2']);
    expect(shared.revokeAccess(['user_2']).isSeeded).toBe(true);
  });

  it('survives a tube toData/fromData round trip', () => {
    expect(Tube.fromData(seededTube().toData()).isSeeded).toBe(true);
  });

  it('survives a catalog item edit', () => {
    const item = seededReagent();
    item.update({ name: 'Anti-CD3 (renamed)' });
    expect(item.isSeeded).toBe(true);
  });

  it('survives archiving a catalog item', () => {
    const item = seededReagent();
    item.archive();
    expect(item.isSeeded).toBe(true);
  });

  it('leaves a visitor-created record unseeded through the same edits', () => {
    const own = Tube.fromData({
      id: 'tube_visitor',
      location: { tankId: 'tank_1', rackId: 'rack_1', boxId: 'A', position: 2 },
      sample: { cellType: 'HeLa' },
      timestamps: { createdAt: new Date(), updatedAt: new Date() },
      labId: 'lab_demo',
    });
    expect(own.update({ sample: { cellType: 'iPSC' } }).isSeeded).toBe(false);
  });
});
