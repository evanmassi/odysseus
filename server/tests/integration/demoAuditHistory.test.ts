/**
 * Demo History Application
 *
 * The seeded history is written as offsets from the run, so it only stays believable if every
 * reset rewrites it. These cover that it replaces rather than accumulates, and stays recent.
 */

import { applyDemoAuditLog } from '@application/commands/applyDemoAuditLog';
import { UserRole } from '@domain/value-objects/UserRole';
import { AuditRepository } from '@infrastructure/repositories/AuditRepository';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, truncateAll } from './setup/testDb';

import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const HOUR_MS = 3_600_000;

describe('demo history application', () => {
  let context: PostgresContext;
  let seed: TestSeed;
  let audit: AuditRepository;

  beforeAll(async () => {
    context = await setupTestDatabase();
    seed = createSeed(context);
    audit = new AuditRepository(context);
  });

  beforeEach(async () => {
    await truncateAll(context);
  });

  async function labWithUsers() {
    const lab = await seed.lab();
    const admin = await seed.user({ labId: lab.id });
    const second = await seed.user({ labId: lab.id });
    return { lab, users: [admin, second] };
  }

  const entriesFor = async (labId: string) =>
    (await audit.findAllForLab({ limit: 1000 }, labId)).items;

  it('writes a history covering storage, the catalogs and the people', async () => {
    const { lab, users } = await labWithUsers();

    const written = await applyDemoAuditLog(audit, users, lab.id);
    const entries = await entriesFor(lab.id);

    expect(entries).toHaveLength(written);
    expect(entries.length).toBeGreaterThan(50);

    const entityTypes = new Set(entries.map(e => e.entityType));
    for (const type of ['tube', 'donor', 'reagent_item', 'supply_item', 'equipment_item', 'user']) {
      expect(entityTypes).toContain(type);
    }
  });

  // The reason the reset rewrites it: offsets are from the run, so an unrewritten log ages.
  it('always ends within the last few hours', async () => {
    const { lab, users } = await labWithUsers();
    await applyDemoAuditLog(audit, users, lab.id);

    const newest = Math.max(...(await entriesFor(lab.id)).map(e => e.timestamp.getTime()));
    expect(Date.now() - newest).toBeLessThan(6 * HOUR_MS);
  });

  it('replaces the history rather than stacking a second copy', async () => {
    const { lab, users } = await labWithUsers();

    await applyDemoAuditLog(audit, users, lab.id);
    const first = await entriesFor(lab.id);
    await applyDemoAuditLog(audit, users, lab.id);
    const second = await entriesFor(lab.id);

    expect(second).toHaveLength(first.length);
  });

  // A lab where one account did everything reads as a demo; setup work also has to come from
  // someone who could actually have done it.
  it('spreads the history across the lab and keeps setup work with an admin', async () => {
    const lab = await seed.lab();
    const admin = await seed.user({ labId: lab.id, role: UserRole.labAdmin() });
    const bench = await seed.user({ labId: lab.id });
    const second = await seed.user({ labId: lab.id });

    await applyDemoAuditLog(audit, [admin, bench, second], lab.id);
    const entries = await entriesFor(lab.id);

    expect(new Set(entries.map(e => e.username)).size).toBeGreaterThan(1);

    const setupActions = ['tank_created', 'rack_assigned', 'researcher_created', 'user_created'];
    const setup = entries.filter(e => setupActions.includes(e.action));
    expect(setup.length).toBeGreaterThan(0);
    expect(setup.every(e => e.username === admin.username)).toBe(true);
  });

  it('leaves a lab with no users alone rather than writing ownerless history', async () => {
    const lab = await seed.lab();

    expect(await applyDemoAuditLog(audit, [], lab.id)).toBe(0);
    expect(await entriesFor(lab.id)).toHaveLength(0);
  });
});
