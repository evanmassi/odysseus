/**
 * Supply Application Service — getBulkBarcodes
 *
 * Covers: empty input short-circuit, full-match reconciliation, partial match
 * producing null barcodeValue for items without primaries, and request-order
 * preservation after deduplication.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { AttributeRepository } from '@domain/repositories/AttributeRepository';
import type { ReagentItemRepository } from '@domain/repositories/ReagentItemRepository';
import type {
  SupplyItemRepository,
  SupplyBarcodeRow,
} from '@domain/repositories/SupplyItemRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';

import { SupplyApplicationService } from './SupplyApplicationService';

function makeService(repoOverrides: Partial<SupplyItemRepository> = {}) {
  const findPrimaryBarcodesByItemIds = jest.fn<Promise<SupplyBarcodeRow[]>, [string[], string]>();
  const repo = {
    findPrimaryBarcodesByItemIds,
    ...repoOverrides,
  } as unknown as SupplyItemRepository;

  const service = new SupplyApplicationService(
    {} as CategoryRepository<SupplyCategory>,
    repo,
    {} as ReagentItemRepository,
    {} as AttributeRepository,
    {} as AccessControlService,
    {} as EventBus,
    {} as StorageRepository
  );
  return { service, repo };
}

function row(itemId: string, barcodeValue: string): SupplyBarcodeRow {
  return {
    id: `bc_${itemId}`,
    itemId,
    barcodeValue,
    barcodeType: 'internal',
    isPrimary: true,
  };
}

describe('SupplyApplicationService.getBulkBarcodes', () => {
  it('short-circuits on empty input without calling the repository', async () => {
    const { service, repo } = makeService();

    const result = await service.getBulkBarcodes('lab_1', []);

    expect(result).toEqual([]);
    expect(repo.findPrimaryBarcodesByItemIds).not.toHaveBeenCalled();
  });

  it('returns a barcode value for every item that has a primary', async () => {
    const { service, repo } = makeService({
      findPrimaryBarcodesByItemIds: jest
        .fn()
        .mockResolvedValue([row('item_1', 'AAA'), row('item_2', 'BBB')]),
    });

    const result = await service.getBulkBarcodes('lab_1', ['item_1', 'item_2']);

    expect(result).toEqual([
      { itemId: 'item_1', barcodeValue: 'AAA' },
      { itemId: 'item_2', barcodeValue: 'BBB' },
    ]);
    expect(repo.findPrimaryBarcodesByItemIds).toHaveBeenCalledWith(['item_1', 'item_2'], 'lab_1');
  });

  it('returns barcodeValue: null for items missing a primary barcode', async () => {
    const { service } = makeService({
      findPrimaryBarcodesByItemIds: jest.fn().mockResolvedValue([row('item_1', 'AAA')]),
    });

    const result = await service.getBulkBarcodes('lab_1', ['item_1', 'item_2', 'item_3']);

    expect(result).toEqual([
      { itemId: 'item_1', barcodeValue: 'AAA' },
      { itemId: 'item_2', barcodeValue: null },
      { itemId: 'item_3', barcodeValue: null },
    ]);
  });

  it('deduplicates item IDs preserving first-occurrence order', async () => {
    const findMock = jest.fn().mockResolvedValue([row('item_1', 'AAA'), row('item_2', 'BBB')]);
    const { service } = makeService({ findPrimaryBarcodesByItemIds: findMock });

    const result = await service.getBulkBarcodes('lab_1', ['item_2', 'item_1', 'item_2', 'item_1']);

    expect(result).toEqual([
      { itemId: 'item_2', barcodeValue: 'BBB' },
      { itemId: 'item_1', barcodeValue: 'AAA' },
    ]);
    expect(findMock).toHaveBeenCalledWith(['item_2', 'item_1'], 'lab_1');
  });
});
