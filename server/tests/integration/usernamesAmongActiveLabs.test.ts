import { ActivateLabCommandHandler } from '@application/commands/LabCommands';
import { LabActivatedEvent } from '@domain/events/LabEvents';
import { UserRole } from '@domain/value-objects/UserRole';
import { RepositoryFactory } from '@infrastructure/di/RepositoryFactory';

import { createSeed, type TestSeed } from './setup/factories';
import { setupTestDatabase, testConnectionString, truncateAll } from './setup/testDb';

import type { EventBus } from '@application/contracts/EventBus';
import type { Repositories } from '@application/contracts/UnitOfWork';
import type { Lab } from '@domain/entities/Lab';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

describe('usernames among active labs', () => {
  let bootstrap: PostgresContext;
  let factory: RepositoryFactory;
  let context: PostgresContext;
  let repos: Repositories;
  let seed: TestSeed;

  const deactivate = async (lab: Lab): Promise<void> => {
    lab.deactivate();
    await repos.labs.save(lab);
  };

  const usernamesInLab = async (labId: string): Promise<string[]> => {
    const users = await repos.users.findByLabId(labId);
    return users.map(user => user.username).sort();
  };

  const labIsActiveFlags = async (labId: string): Promise<boolean[]> => {
    const rows = await context.queryMany<{ lab_is_active: boolean }>(
      'SELECT lab_is_active FROM users WHERE lab_id = $1',
      [labId]
    );
    return rows.map(row => row.lab_is_active);
  };

  beforeAll(async () => {
    bootstrap = await setupTestDatabase();
    factory = new RepositoryFactory({
      connectionString: testConnectionString(),
      ssl: false,
      maxConnections: 5,
    });
    await factory.initialize();
    context = factory.getPostgresContext();
    repos = factory.getRepositories();
    seed = createSeed(context);
  });

  afterEach(async () => {
    await truncateAll(context);
  });

  afterAll(async () => {
    await factory.close();
    await bootstrap.close();
  });

  describe('repository', () => {
    it('stops counting a username once its lab is deactivated', async () => {
      const oldLab = await seed.lab();
      await seed.user({ labId: oldLab.id, username: 'evan.massi' });

      expect(await repos.users.usernameExistsInActiveLabs('evan.massi')).toBe(true);

      await deactivate(oldLab);

      expect(await repos.users.usernameExistsInActiveLabs('evan.massi')).toBe(false);
    });

    it('lets an active lab reuse a username held only in a deactivated lab', async () => {
      const oldLab = await seed.lab();
      await seed.user({ labId: oldLab.id, username: 'evan.massi' });
      await deactivate(oldLab);

      const newLab = await seed.lab();
      const current = await seed.user({ labId: newLab.id, username: 'evan.massi' });

      const found = await repos.users.findByUsernameInActiveLabs('evan.massi');
      expect(found?.id).toBe(current.id);
    });

    it('rejects the same username in two active labs', async () => {
      const labA = await seed.lab();
      const labB = await seed.lab();
      await seed.user({ labId: labA.id, username: 'evan.massi' });

      await expect(seed.user({ labId: labB.id, username: 'evan.massi' })).rejects.toMatchObject({
        code: '23505',
      });
    });

    it('counts a system admin, who has no lab, as active', async () => {
      await seed.user({ username: 'root', role: UserRole.systemAdmin() });

      expect(await repos.users.usernameExistsInActiveLabs('root')).toBe(true);
    });

    it('keeps every user in step when a lab is deactivated and reactivated', async () => {
      const lab = await seed.lab();
      await seed.user({ labId: lab.id });
      await seed.user({ labId: lab.id });

      await deactivate(lab);
      expect(await labIsActiveFlags(lab.id)).toEqual([false, false]);

      lab.activate();
      await repos.labs.save(lab);
      expect(await labIsActiveFlags(lab.id)).toEqual([true, true]);
    });

    it('refuses to reactivate a lab whose username is now held elsewhere', async () => {
      const oldLab = await seed.lab();
      await seed.user({ labId: oldLab.id, username: 'evan.massi' });
      await deactivate(oldLab);
      const newLab = await seed.lab();
      await seed.user({ labId: newLab.id, username: 'evan.massi' });

      oldLab.activate();
      await expect(repos.labs.save(oldLab)).rejects.toMatchObject({ code: '23505' });

      const reloaded = await repos.labs.findById(oldLab.id);
      expect(reloaded?.isActive).toBe(false);
    });
  });

  describe('lab reactivation', () => {
    const activate = async (labId: string) => {
      const systemAdmin = await seed.user({ username: 'root', role: UserRole.systemAdmin() });
      const publish = jest.fn();
      const handler = new ActivateLabCommandHandler(repos.users, factory, {
        publish,
      } as unknown as EventBus);

      await handler.handle({ userId: systemAdmin.id, labId });

      return publish;
    };

    it('renumbers a returning username that an active lab now holds', async () => {
      const oldLab = await seed.lab();
      await seed.user({ labId: oldLab.id, username: 'evan.massi' });
      await seed.user({ labId: oldLab.id, username: 'evan.massi.2' });
      await deactivate(oldLab);
      const newLab = await seed.lab();
      await seed.user({ labId: newLab.id, username: 'evan.massi' });

      const publish = await activate(oldLab.id);

      expect((await repos.labs.findById(oldLab.id))?.isActive).toBe(true);
      expect(await usernamesInLab(oldLab.id)).toEqual(['evan.massi.2', 'evan.massi.3']);
      expect(await usernamesInLab(newLab.id)).toEqual(['evan.massi']);

      const event = publish.mock.calls[0][0] as LabActivatedEvent;
      expect(event).toBeInstanceOf(LabActivatedEvent);
      expect(event.usernameReassignments).toEqual([{ from: 'evan.massi', to: 'evan.massi.3' }]);
    });

    it('keeps every username when nothing collides', async () => {
      const lab = await seed.lab();
      await seed.user({ labId: lab.id, username: 'evan.massi' });
      await deactivate(lab);

      const publish = await activate(lab.id);

      expect(await usernamesInLab(lab.id)).toEqual(['evan.massi']);
      const event = publish.mock.calls[0][0] as LabActivatedEvent;
      expect(event.usernameReassignments).toEqual([]);
    });

    it('does nothing for a lab that is already active', async () => {
      const lab = await seed.lab();

      const publish = await activate(lab.id);

      expect(publish).not.toHaveBeenCalled();
    });
  });
});
