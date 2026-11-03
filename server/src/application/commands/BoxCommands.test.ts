import type { EventBus } from '@application/contracts/EventBus';
import type { Storage } from '@domain/entities/Storage';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { BoxUpdatedEvent } from '@domain/events/StorageEvents';
import type { BoxReference, StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { UpdateBoxGridCommandHandler } from './BoxCommands';

import type { GridConfiguration } from '@odysseus/shared-schemas';

interface TestBox {
  name: string;
  gridConfig: { rows: number; cols: number };
  isSeeded?: boolean;
  positionDisplay?: { format: 'numeric' };
}

interface TestRack {
  id: string;
  name: string;
  boxes: TestBox[];
}

const NINE: TestBox['gridConfig'] = { rows: 9, cols: 9 };
const TEN: GridConfiguration = { rows: 10, cols: 10 };

function box(name: string, overrides: Partial<TestBox> = {}): TestBox {
  return { name, gridConfig: NINE, ...overrides };
}

function makeHandler(
  racks: TestRack[],
  options: { isDemo?: boolean; isAdmin?: boolean; occupied?: string[] } = {}
) {
  const config = {
    tanks: [{ id: 'tank1', name: 'Tank 1', racks }],
  } as unknown as Storage;

  const actor = {
    isAdmin: () => options.isAdmin ?? true,
    isDemo: options.isDemo ?? false,
  } as unknown as User;
  const userRepository = {
    findByIdAnyLab: jest.fn().mockResolvedValue(actor),
  } as unknown as UserRepository;

  const occupied = new Set(options.occupied ?? []);
  const resizeEmptyBoxes = jest.fn((_labId: string, boxes: BoxReference[]) =>
    Promise.resolve(boxes.filter(b => !occupied.has(`${b.rackId}/${b.boxId}`)))
  );
  const storageRepository = {
    getForLab: jest.fn().mockResolvedValue(config),
    resizeEmptyBoxes,
  } as unknown as StorageRepository;

  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;

  return {
    handler: new UpdateBoxGridCommandHandler(storageRepository, userRepository, eventBus),
    resizeEmptyBoxes,
    publish,
  };
}

const command = { userId: 'admin', labId: 'lab1', tankId: 'tank1', gridConfig: TEN };

describe('UpdateBoxGridCommandHandler', () => {
  describe('scope', () => {
    it('resizes every box in the tank that is not already at the target grid', async () => {
      const { handler, resizeEmptyBoxes } = makeHandler([
        { id: 'r1', name: 'Rack 1', boxes: [box('A'), box('B', { gridConfig: TEN })] },
        { id: 'r2', name: 'Rack 2', boxes: [box('A')] },
      ]);

      const result = await handler.handle(command);

      expect(result).toEqual({ boxesUpdated: 2, occupiedSkipped: 0, protectedSkipped: 0 });
      expect(resizeEmptyBoxes).toHaveBeenCalledWith(
        'lab1',
        [
          { tankId: 'tank1', rackId: 'r1', boxId: 'A' },
          { tankId: 'tank1', rackId: 'r2', boxId: 'A' },
        ],
        TEN,
        'admin'
      );
    });

    it('limits the change to one rack', async () => {
      const { handler, resizeEmptyBoxes } = makeHandler([
        { id: 'r1', name: 'Rack 1', boxes: [box('A')] },
        { id: 'r2', name: 'Rack 2', boxes: [box('A'), box('B')] },
      ]);

      const result = await handler.handle({ ...command, rackId: 'r2' });

      expect(result.boxesUpdated).toBe(2);
      expect(resizeEmptyBoxes.mock.calls[0][1].map(b => b.rackId)).toEqual(['r2', 'r2']);
    });

    it('limits the change to one box, matching its name case-insensitively', async () => {
      const { handler, resizeEmptyBoxes } = makeHandler([
        { id: 'r1', name: 'Rack 1', boxes: [box('A'), box('B')] },
      ]);

      await handler.handle({ ...command, rackId: 'r1', boxId: 'b' });

      expect(resizeEmptyBoxes.mock.calls[0][1]).toEqual([
        { tankId: 'tank1', rackId: 'r1', boxId: 'B' },
      ]);
    });

    it('rejects a rack or box that does not exist', async () => {
      const { handler } = makeHandler([{ id: 'r1', name: 'Rack 1', boxes: [box('A')] }]);

      await expect(handler.handle({ ...command, rackId: 'missing' })).rejects.toThrow(
        NotFoundError
      );
      await expect(handler.handle({ ...command, rackId: 'r1', boxId: 'Z' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('skipped boxes', () => {
    it('counts boxes the repository left alone because they hold tubes', async () => {
      const { handler, publish } = makeHandler(
        [{ id: 'r1', name: 'Rack 1', boxes: [box('A'), box('B'), box('C')] }],
        { occupied: ['r1/B'] }
      );

      const result = await handler.handle(command);

      expect(result).toEqual({ boxesUpdated: 2, occupiedSkipped: 1, protectedSkipped: 0 });
      const published = publish.mock.calls.map(([event]: [BoxUpdatedEvent]) => event.boxId);
      expect(published).toEqual(['A', 'C']);
    });

    it('protects seeded boxes from a demo user and changes them for a real lab', async () => {
      const racks = [{ id: 'r1', name: 'Rack 1', boxes: [box('A', { isSeeded: true }), box('B')] }];

      const demo = makeHandler(racks, { isDemo: true });
      expect(await demo.handler.handle(command)).toEqual({
        boxesUpdated: 1,
        occupiedSkipped: 0,
        protectedSkipped: 1,
      });

      const real = makeHandler(racks);
      expect((await real.handler.handle(command)).boxesUpdated).toBe(2);
    });

    it('does nothing when every box already uses the target grid', async () => {
      const { handler, resizeEmptyBoxes, publish } = makeHandler([
        { id: 'r1', name: 'Rack 1', boxes: [box('A', { gridConfig: TEN })] },
      ]);

      const result = await handler.handle(command);

      expect(result).toEqual({ boxesUpdated: 0, occupiedSkipped: 0, protectedSkipped: 0 });
      expect(resizeEmptyBoxes).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('audit trail', () => {
    it('records the rows and columns change, plus a cleared custom position display', async () => {
      const { handler, publish } = makeHandler([
        { id: 'r1', name: 'Rack 1', boxes: [box('A', { positionDisplay: { format: 'numeric' } })] },
      ]);

      await handler.handle(command);

      const event: BoxUpdatedEvent = publish.mock.calls[0][0];
      expect(event.changes).toEqual([
        { field: 'gridConfig.rows', oldValue: 9, newValue: 10 },
        { field: 'gridConfig.cols', oldValue: 9, newValue: 10 },
        { field: 'positionDisplay', oldValue: { format: 'numeric' }, newValue: undefined },
      ]);
    });
  });

  it('rejects a non-admin', async () => {
    const { handler } = makeHandler([{ id: 'r1', name: 'Rack 1', boxes: [box('A')] }], {
      isAdmin: false,
    });

    await expect(handler.handle(command)).rejects.toThrow(PermissionError);
  });
});
