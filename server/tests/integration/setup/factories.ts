/**
 * Integration Test Seed Factories
 *
 * Persist real domain entities through their repositories so isolation tests operate on
 * actual rows. Bound to one PostgresContext; every factory fills required FKs (auto-seeding
 * a Person for a Researcher, a Category for an item) so tests read as intent, not plumbing.
 */

import { createTestTube, createTestUser } from '@domain/__tests__/helpers';
import { Donor } from '@domain/entities/Donor';
import { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';
import { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import { EquipmentItem } from '@domain/entities/EquipmentItem';
import { Lab } from '@domain/entities/Lab';
import { Person } from '@domain/entities/Person';
import { ReagentCategory } from '@domain/entities/ReagentCategory';
import { ReagentItem } from '@domain/entities/ReagentItem';
import { ReagentLocation } from '@domain/entities/ReagentLocation';
import { Researcher } from '@domain/entities/Researcher';
import { SupplyCategory } from '@domain/entities/SupplyCategory';
import { SupplyDocument } from '@domain/entities/SupplyDocument';
import { SupplyItem } from '@domain/entities/SupplyItem';
import { generateId } from '@domain/utils/generateId';

import { DonorRepository } from '@infrastructure/repositories/DonorRepository';
import {
  CategoryRepository,
  EQUIPMENT_CATEGORY_TABLES,
  REAGENT_CATEGORY_TABLES,
  SUPPLY_CATEGORY_TABLES,
} from '@infrastructure/repositories/CategoryRepository';
import { EquipmentItemRepository } from '@infrastructure/repositories/EquipmentItemRepository';
import { LabRepository } from '@infrastructure/repositories/LabRepository';
import { PersonRepository } from '@infrastructure/repositories/PersonRepository';
import { ReagentItemRepository } from '@infrastructure/repositories/ReagentItemRepository';
import { ReagentLocationRepository } from '@infrastructure/repositories/ReagentLocationRepository';
import { ResearcherRepository } from '@infrastructure/repositories/ResearcherRepository';
import { StorageRepository } from '@infrastructure/repositories/StorageRepository';
import { SupplyItemRepository } from '@infrastructure/repositories/SupplyItemRepository';
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';

import type { Tube } from '@domain/entities/Tube';
import type { User } from '@domain/entities/User';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import type {
  SupplyBarcodeRow,
  SupplyPackagingLevelRow,
} from '@domain/repositories/SupplyItemRepository';

export function createSeed(context: PostgresContext) {
  const labs = new LabRepository(context);
  const persons = new PersonRepository(context);
  const researchers = new ResearcherRepository(context);
  const donors = new DonorRepository(context);
  const equipmentCategories = new CategoryRepository(context, EQUIPMENT_CATEGORY_TABLES, data =>
    EquipmentCategory.fromData(data)
  );
  const equipmentItems = new EquipmentItemRepository(context);
  const supplyCategories = new CategoryRepository(context, SUPPLY_CATEGORY_TABLES, data =>
    SupplyCategory.fromData(data)
  );
  const supplyItems = new SupplyItemRepository(context);
  const reagentCategories = new CategoryRepository(context, REAGENT_CATEGORY_TABLES, data =>
    ReagentCategory.fromData(data)
  );
  const reagentItems = new ReagentItemRepository(context);
  const reagentLocations = new ReagentLocationRepository(context);
  const tubes = new TubeRepository(context, new StorageRepository(context));
  const users = new UserRepository(context);

  async function lab(overrides: { name?: string } = {}): Promise<Lab> {
    const entity = Lab.create(overrides.name ?? `Lab ${generateId('lab')}`);
    await labs.save(entity);
    return entity;
  }

  async function user(overrides: { labId?: string; username?: string } = {}): Promise<User> {
    const entity = createTestUser({
      username: overrides.username ?? `user-${generateId('u')}`,
      labId: overrides.labId,
    });
    await users.save(entity);
    return entity;
  }

  async function tube(overrides: { labId: string; position?: number }): Promise<Tube> {
    const entity = createTestTube({
      labId: overrides.labId,
      location: { tankId: 'T1', rackId: 'R1', boxId: 'A', position: overrides.position ?? 1 },
    });
    await tubes.save(entity);
    return entity;
  }

  async function person(
    overrides: { firstName?: string; lastName?: string; email?: string } = {}
  ): Promise<Person> {
    const entity = Person.create(
      overrides.firstName ?? 'Test',
      overrides.lastName ?? 'Person',
      overrides.email ?? `${generateId('person')}@test.local`
    );
    await persons.save(entity);
    return entity;
  }

  async function researcher(overrides: {
    labId: string;
    personId?: string;
    source?: 'registration' | 'admin';
  }): Promise<Researcher> {
    const personId = overrides.personId ?? (await person()).id;
    const entity = Researcher.create(personId, {
      labId: overrides.labId,
      source: overrides.source ?? 'admin',
    });
    await researchers.save(entity);
    return entity;
  }

  async function donor(overrides: {
    labId: string;
    donorSourceId?: string;
    donorInternalId?: string;
    species?: string;
  }): Promise<Donor> {
    const entity = Donor.create({
      labId: overrides.labId,
      donorSourceId: overrides.donorSourceId ?? generateId('DNR'),
      donorInternalId: overrides.donorInternalId,
      species: overrides.species ?? 'Human',
    });
    await donors.save(entity);
    return entity;
  }

  async function donorCollectionHistory(overrides: {
    donorId: string;
    specimenType?: string;
    source?: string;
  }): Promise<DonorCollectionHistory> {
    const entry = DonorCollectionHistory.create({
      donorId: overrides.donorId,
      specimenType: overrides.specimenType ?? 'Blood',
      source: overrides.source ?? 'Biopsy',
    });
    await donors.saveCollectionHistory(entry);
    return entry;
  }

  async function equipmentCategory(overrides: {
    labId: string;
    name?: string;
  }): Promise<EquipmentCategory> {
    const entity = EquipmentCategory.create({
      labId: overrides.labId,
      name: overrides.name ?? `Cat-${generateId('eqcat')}`,
    });
    await equipmentCategories.save(entity);
    return entity;
  }

  async function equipmentItem(overrides: {
    labId: string;
    categoryId?: string;
    name?: string;
  }): Promise<EquipmentItem> {
    const categoryId =
      overrides.categoryId ?? (await equipmentCategory({ labId: overrides.labId })).id;
    const entity = EquipmentItem.create({
      labId: overrides.labId,
      categoryId,
      name: overrides.name ?? 'Test Equipment',
    });
    await equipmentItems.save(entity);
    return entity;
  }

  async function equipmentDocument(overrides: {
    itemId: string;
    label?: string;
    url?: string;
  }): Promise<EquipmentDocument> {
    const entity = EquipmentDocument.create({
      itemId: overrides.itemId,
      label: overrides.label ?? 'Manual',
      url: overrides.url ?? 'https://example.test/manual.pdf',
    });
    await equipmentItems.saveDocument(entity);
    return entity;
  }

  async function supplyCategory(overrides: {
    labId: string;
    name?: string;
  }): Promise<SupplyCategory> {
    const entity = SupplyCategory.create({
      labId: overrides.labId,
      name: overrides.name ?? `Cat-${generateId('supcat')}`,
    });
    await supplyCategories.save(entity);
    return entity;
  }

  async function supplyItem(overrides: {
    labId: string;
    categoryId?: string;
    name?: string;
  }): Promise<SupplyItem> {
    const categoryId =
      overrides.categoryId ?? (await supplyCategory({ labId: overrides.labId })).id;
    const entity = SupplyItem.create({
      labId: overrides.labId,
      categoryId,
      name: overrides.name ?? 'Test Supply',
    });
    await supplyItems.save(entity);
    return entity;
  }

  async function supplyDocument(overrides: {
    itemId: string;
    label?: string;
    url?: string;
  }): Promise<SupplyDocument> {
    const entity = SupplyDocument.create({
      itemId: overrides.itemId,
      label: overrides.label ?? 'SOP',
      url: overrides.url ?? 'https://example.test/sop.pdf',
    });
    await supplyItems.saveDocument(entity);
    return entity;
  }

  async function supplyBarcode(overrides: {
    itemId: string;
    barcodeValue?: string;
    barcodeType?: SupplyBarcodeRow['barcodeType'];
    isPrimary?: boolean;
    label?: string;
  }): Promise<SupplyBarcodeRow> {
    const row: SupplyBarcodeRow = {
      id: generateId('sbar'),
      itemId: overrides.itemId,
      barcodeValue: overrides.barcodeValue ?? generateId('sbarval'),
      barcodeType: overrides.barcodeType ?? 'internal',
      isPrimary: overrides.isPrimary ?? true,
      label: overrides.label,
    };
    await supplyItems.saveBarcode(row);
    return row;
  }

  async function supplyPackagingLevel(overrides: {
    itemId: string;
    unitName?: string;
    quantity?: number;
    parentUnit?: string;
  }): Promise<SupplyPackagingLevelRow> {
    const row: SupplyPackagingLevelRow = {
      id: generateId('spkg'),
      itemId: overrides.itemId,
      unitName: overrides.unitName ?? 'case',
      quantity: overrides.quantity ?? 10,
      parentUnit: overrides.parentUnit,
    };
    await supplyItems.savePackagingLevel(row);
    return row;
  }

  async function reagentCategory(overrides: {
    labId: string;
    name?: string;
  }): Promise<ReagentCategory> {
    const entity = ReagentCategory.create({
      labId: overrides.labId,
      name: overrides.name ?? `Cat-${generateId('rcat')}`,
    });
    await reagentCategories.save(entity);
    return entity;
  }

  async function reagentLocation(overrides: {
    labId: string;
    name?: string;
  }): Promise<ReagentLocation> {
    const entity = ReagentLocation.create({
      labId: overrides.labId,
      name: overrides.name ?? `Loc-${generateId('rloc')}`,
    });
    await reagentLocations.save(entity);
    return entity;
  }

  async function reagentItem(overrides: {
    labId: string;
    categoryId?: string;
    name?: string;
  }): Promise<ReagentItem> {
    const categoryId =
      overrides.categoryId ?? (await reagentCategory({ labId: overrides.labId })).id;
    const entity = ReagentItem.create({
      labId: overrides.labId,
      categoryId,
      name: overrides.name ?? 'Test Reagent',
      stockUnit: 'µg',
    });
    await reagentItems.save(entity);
    return entity;
  }

  return {
    lab,
    user,
    tube,
    person,
    researcher,
    donor,
    donorCollectionHistory,
    equipmentCategory,
    equipmentItem,
    equipmentDocument,
    supplyCategory,
    supplyItem,
    supplyDocument,
    supplyBarcode,
    supplyPackagingLevel,
    reagentCategory,
    reagentLocation,
    reagentItem,
  };
}

export type TestSeed = ReturnType<typeof createSeed>;
