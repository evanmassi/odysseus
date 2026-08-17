import type { EventBus } from '@application/contracts/EventBus';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { BulkReassignResourcesCommandHandler } from './BulkAssignmentCommands';

interface TestBox {
  id: string;
  assignedUserId?: string | null;
  isSeeded?: boolean;
}

interface TestRack {
  id: string;
  assignedUserId?: string;
  isSeeded?: boolean;
  boxes: TestBox[];
}

function makeConfig(racks: TestRack[]) {
  const data = { tanks: [{ id: 'tank1', racks }], systemSettings: {} };
  const config = {
    version: 1,
    toData: () => data,
    updateFromData: jest.fn(),
    applyPersistedVersion: jest.fn(),
  } as unknown as Storage;
  return { config, data };
}

function makeHandler(config: Storage, actor: { isDemo: boolean }) {
  const admin = { isAdmin: () => true, isDemo: actor.isDemo } as unknown as User;

  const userRepository = {
    findByIdAnyLab: jest.fn().mockResolvedValue(admin),
    findById: jest
      .fn()
      .mockImplementation((id: string) => Promise.resolve({ id, username: id } as unknown as User)),
  } as unknown as UserRepository;

  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue(config),
    saveWithOptimisticLock: jest.fn().mockResolvedValue(2),
  } as unknown as StorageRepository;

  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;

  return {
    handler: new BulkReassignResourcesCommandHandler(storageRepository, userRepository, eventBus),
    storageRepository,
    publish,
  };
}

const command = { userId: 'admin', labId: 'lab1', toUserId: 'u2' };

describe('BulkReassignResourcesCommandHandler', () => {
  describe('demo protection', () => {
    it('leaves seeded resources alone for a demo user and counts them as protected', async () => {
      const { config, data } = makeConfig([
        { id: 'r1', assignedUserId: 'u1', isSeeded: true, boxes: [] },
        {
          id: 'r2',
          assignedUserId: 'u1',
          boxes: [
            { id: 'b1', assignedUserId: 'u1', isSeeded: true },
            { id: 'b2', assignedUserId: 'u1' },
          ],
        },
      ]);
      const { handler } = makeHandler(config, { isDemo: true });

      const result = await handler.handle({ ...command, fromUserId: 'u1' });

      expect(result).toEqual({ racksAffected: 1, boxesAffected: 1, protectedSkipped: 2 });
      expect(data.tanks[0].racks[0].assignedUserId).toBe('u1');
      expect(data.tanks[0].racks[1].assignedUserId).toBe('u2');
      expect(data.tanks[0].racks[1].boxes[0].assignedUserId).toBe('u1');
      expect(data.tanks[0].racks[1].boxes[1].assignedUserId).toBe('u2');
    });

    it('moves seeded resources for a real lab and protects nothing', async () => {
      const { config, data } = makeConfig([
        { id: 'r1', assignedUserId: 'u1', isSeeded: true, boxes: [] },
      ]);
      const { handler } = makeHandler(config, { isDemo: false });

      const result = await handler.handle({ ...command, fromUserId: 'u1' });

      expect(result).toEqual({ racksAffected: 1, boxesAffected: 0, protectedSkipped: 0 });
      expect(data.tanks[0].racks[0].assignedUserId).toBe('u2');
    });

    it('reports what it protected even when nothing could move', async () => {
      const { config } = makeConfig([
        { id: 'r1', assignedUserId: 'u1', isSeeded: true, boxes: [] },
      ]);
      const { handler, storageRepository, publish } = makeHandler(config, { isDemo: true });

      const result = await handler.handle({ ...command, fromUserId: 'u1' });

      expect(result).toEqual({ racksAffected: 0, boxesAffected: 0, protectedSkipped: 1 });
      expect(storageRepository.saveWithOptimisticLock).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('unassigned source', () => {
    it('takes ownerless racks and explicitly common boxes, leaving inherited boxes to follow', async () => {
      const { config, data } = makeConfig([
        { id: 'r1', boxes: [{ id: 'b1' }, { id: 'b2', assignedUserId: null }] },
        { id: 'r2', assignedUserId: 'u1', boxes: [{ id: 'b3', assignedUserId: null }] },
      ]);
      const { handler } = makeHandler(config, { isDemo: false });

      const result = await handler.handle({ ...command, fromUserId: undefined });

      expect(result).toEqual({ racksAffected: 1, boxesAffected: 2, protectedSkipped: 0 });
      expect(data.tanks[0].racks[0].assignedUserId).toBe('u2');
      expect(data.tanks[0].racks[0].boxes[0].assignedUserId).toBeUndefined();
      expect(data.tanks[0].racks[0].boxes[1].assignedUserId).toBe('u2');
      expect(data.tanks[0].racks[1].assignedUserId).toBe('u1');
      expect(data.tanks[0].racks[1].boxes[0].assignedUserId).toBe('u2');
    });

    it('does not look up a source user when there is none', async () => {
      const { config } = makeConfig([{ id: 'r1', boxes: [] }]);
      const { handler } = makeHandler(config, { isDemo: false });

      await handler.handle({ ...command, fromUserId: undefined });

      const userRepository = (handler as unknown as { userRepository: { findById: jest.Mock } })
        .userRepository;
      expect(userRepository.findById).toHaveBeenCalledTimes(1);
      expect(userRepository.findById).toHaveBeenCalledWith('u2', 'lab1');
    });
  });
});
