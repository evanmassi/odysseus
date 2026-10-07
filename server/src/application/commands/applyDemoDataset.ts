import { DEMO_DATASET } from '@application/config/DemoDataset';
import type {
  DemoCategory,
  DemoLocation,
  DemoReagent,
  DemoSupply,
} from '@application/config/DemoDataset';
import type { Repositories } from '@application/contracts/UnitOfWork';
import { Donor } from '@domain/entities/Donor';
import { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';
import { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import { EquipmentItem } from '@domain/entities/EquipmentItem';
import { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import { LabLocation } from '@domain/entities/LabLocation';
import { LookupValue } from '@domain/entities/LookupValue';
import { Person } from '@domain/entities/Person';
import { ReagentCategory } from '@domain/entities/ReagentCategory';
import { ReagentDocument } from '@domain/entities/ReagentDocument';
import { ReagentItem } from '@domain/entities/ReagentItem';
import { Researcher } from '@domain/entities/Researcher';
import type { Storage } from '@domain/entities/Storage';
import { SupplyCategory } from '@domain/entities/SupplyCategory';
import { SupplyDocument } from '@domain/entities/SupplyDocument';
import { SupplyItem } from '@domain/entities/SupplyItem';
import { Tube } from '@domain/entities/Tube';
import { ValidationError } from '@domain/errors/ValidationError';
import { generateInternalBarcodeValue } from '@domain/utils/barcodeValue';
import { generateId } from '@domain/utils/generateId';
import { TubeLocation } from '@domain/value-objects/TubeLocation';

import type { LookupCategory } from '@odysseus/shared-schemas';

const DAY_MS = 86_400_000;
const SUPPLY_RECEIVED_DAYS_AGO_DEFAULT = 60;
const TUBE_LOCKED_DAYS_AGO = 12;

const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY_MS);
const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);
const inDays = (n: number): string => dateOnly(new Date(Date.now() + n * DAY_MS));
const oldestFirst = <T extends { daysAgo: number }>(events: readonly T[]): T[] =>
  [...events].sort((a, b) => b.daysAgo - a.daysAgo);

interface SeatRun {
  groupIndex: number;
  seats: TubeLocation[];
}

interface BoxPlan {
  ordinal: number;
  runs: SeatRun[];
}

// PITFALL: seat skips must repeat exactly on every reset, so this stands in for randomness; a fixed stride draws visible diagonals.
function seatHash(boxOrdinal: number, position: number): number {
  let h = (boxOrdinal * 374761393 + position * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function planBoxes(config: Storage, groupTotal: number): BoxPlan[] {
  const { fillPattern, groupsPerBox, gapPercent } = DEMO_DATASET.placement;
  const plans: BoxPlan[] = [];
  let ordinal = 0;
  let nextGroup = 0;

  for (const tank of config.tanks) {
    for (const rack of tank.racks) {
      for (const box of rack.boxes) {
        const fill = fillPattern[ordinal % fillPattern.length];
        const target = Math.round(box.maxPositions * fill);
        const seats: TubeLocation[] = [];

        for (let position = 1; position <= box.maxPositions && seats.length < target; position++) {
          if (fill < 1 && seatHash(ordinal, position) % 100 < gapPercent) continue;
          seats.push(
            TubeLocation.create({
              tankId: tank.id,
              rackId: rack.id,
              boxId: box.name,
              position,
            })
          );
        }

        const wanted = seats.length === 0 ? 0 : groupsPerBox[ordinal % groupsPerBox.length];
        const runs: SeatRun[] = [];
        let cursor = 0;
        for (let i = 0; i < wanted && cursor < seats.length; i++) {
          const size = Math.ceil((seats.length - cursor) / (wanted - i));
          runs.push({
            groupIndex: nextGroup % groupTotal,
            seats: seats.slice(cursor, cursor + size),
          });
          cursor += size;
          nextGroup++;
        }

        plans.push({ ordinal, runs });
        ordinal++;
      }
    }
  }

  return plans;
}

async function upsertLocations(
  repos: Repositories,
  labId: string,
  nodes: DemoLocation[],
  parentId?: string
): Promise<void> {
  let sortOrder = 0;
  for (const node of nodes) {
    await repos.labLocations.save(
      LabLocation.fromData({
        id: node.id,
        labId,
        name: node.name,
        parentId,
        sortOrder: sortOrder++,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    if (node.children) {
      await upsertLocations(repos, labId, node.children, node.id);
    }
  }
}

interface FlatCategory {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

// PITFALL: parents must precede their children because parent_id references the same table.
function flattenCategories(nodes: readonly DemoCategory[], parentId?: string): FlatCategory[] {
  return nodes.flatMap((node, index) => [
    { id: node.id, name: node.name, parentId, sortOrder: index },
    ...(node.children ? flattenCategories(node.children, node.id) : []),
  ]);
}

async function seedNewSupply(
  repos: Repositories,
  supply: DemoSupply,
  labId: string,
  demoUserId: string
): Promise<void> {
  await repos.supplyItems.saveBarcode({
    id: generateId('sbar'),
    itemId: supply.id,
    barcodeValue: generateInternalBarcodeValue('supplyItem'),
    barcodeType: 'internal',
    isPrimary: true,
  });
  for (const document of supply.documents ?? []) {
    await repos.supplyItems.saveDocument(SupplyDocument.create({ itemId: supply.id, ...document }));
  }
  for (const level of supply.packaging ?? []) {
    await repos.supplyItems.savePackagingLevel({
      id: generateId('spkg'),
      itemId: supply.id,
      unitName: level.unitName,
      quantity: level.quantity,
      parentUnit: level.parentUnit,
    });
  }

  const history = supply.history ?? [];
  const receivedAt = daysAgo(supply.receivedDaysAgo ?? SUPPLY_RECEIVED_DAYS_AGO_DEFAULT);

  for (const stock of supply.stock) {
    const netChange = history
      .filter(event => event.locationRef === stock.locationRef && !event.voidReason)
      .reduce((sum, event) => sum + event.quantityChange, 0);
    const opening = stock.quantity - netChange;
    if (opening <= 0) continue;
    await repos.supplyItems.recordTransaction({
      itemId: supply.id,
      locationId: stock.locationRef,
      labId,
      type: 'received',
      quantityChange: opening,
      performedBy: demoUserId,
      occurredAt: receivedAt,
    });
  }

  for (const event of oldestFirst(history)) {
    const transaction = await repos.supplyItems.recordTransaction({
      itemId: supply.id,
      locationId: event.locationRef,
      labId,
      type: event.type,
      quantityChange: event.quantityChange,
      notes: event.notes,
      performedBy: demoUserId,
      occurredAt: daysAgo(event.daysAgo),
    });
    if (event.voidReason) {
      await repos.supplyItems.voidTransaction({
        transactionId: transaction.id,
        labId,
        voidedBy: demoUserId,
        voidReason: event.voidReason,
      });
    }
  }
}

async function seedNewReagent(
  repos: Repositories,
  reagent: DemoReagent,
  labId: string,
  demoUserId: string
): Promise<void> {
  await repos.reagentItems.saveBarcode({
    id: generateId('rbcd'),
    itemId: reagent.id,
    barcodeValue: generateInternalBarcodeValue('reagentItem'),
    barcodeType: 'internal',
    isPrimary: true,
  });
  for (const document of reagent.documents ?? []) {
    await repos.reagentItems.saveDocument(
      ReagentDocument.create({ itemId: reagent.id, ...document })
    );
  }
  for (const level of reagent.packaging ?? []) {
    await repos.reagentItems.savePackagingLevel({
      id: generateId('rpkg'),
      itemId: reagent.id,
      unitName: level.unitName,
      quantity: level.quantity,
      parentUnit: level.parentUnit,
    });
  }

  const history = reagent.history ?? [];
  const lotsByNumber = new Map<string, { lotId?: string; locationRef: string }>();

  // PITFALL: receiving is what creates a lot, so the stock and its ledger entry land together.
  for (const lot of reagent.lots) {
    const consumed = history
      .filter(event => event.lotNumber === lot.lotNumber && !event.voidReason)
      .reduce((sum, event) => sum + event.quantity, 0);
    const [receipt] = await repos.reagentItems.recordTransaction({
      itemId: reagent.id,
      locationId: lot.locationRef,
      labId,
      type: 'received',
      quantity: lot.quantity + consumed,
      lotNumber: lot.lotNumber,
      expirationDate: inDays(lot.expiresInDays),
      receivedDate: dateOnly(daysAgo(lot.receivedDaysAgo)),
      performedBy: demoUserId,
      occurredAt: daysAgo(lot.receivedDaysAgo),
    });
    lotsByNumber.set(lot.lotNumber, { lotId: receipt.lotId, locationRef: lot.locationRef });
  }

  for (const event of oldestFirst(history)) {
    const lot = lotsByNumber.get(event.lotNumber);
    if (!lot) {
      throw new ValidationError(`Demo reagent ${reagent.id} has no lot ${event.lotNumber}.`);
    }
    const [transaction] = await repos.reagentItems.recordTransaction({
      itemId: reagent.id,
      locationId: lot.locationRef,
      labId,
      type: event.type,
      quantity: event.quantity,
      lotId: lot.lotId,
      notes: event.notes,
      performedBy: demoUserId,
      occurredAt: daysAgo(event.daysAgo),
    });
    if (event.voidReason) {
      await repos.reagentItems.voidTransaction({
        transactionId: transaction.id,
        labId,
        voidedBy: demoUserId,
        voidReason: event.voidReason,
      });
    }
  }
}

export interface ApplyDemoDatasetResult {
  tubes: number;
  donors: number;
  researchers: number;
  reagents: number;
  supplies: number;
  equipment: number;
}

// PITFALL: performed_by on stock transactions is a NOT NULL user foreign key, so seeded transactions are attributed to the demo lab's only user.
export async function applyDemoDataset(
  repos: Repositories,
  labId: string,
  demoUserId: string,
  config: Storage
): Promise<ApplyDemoDatasetResult> {
  const dataset = DEMO_DATASET;

  let lookupOrder = 0;
  for (const [category, values] of Object.entries(dataset.lookupValues)) {
    for (const value of values) {
      await repos.lookupValues.save(
        LookupValue.fromData({
          id: `lookup_demo_${category}_${value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
          category: category as LookupCategory,
          value,
          sortOrder: lookupOrder++,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          labId,
        })
      );
    }
  }

  // PITFALL: custom units are insert-only, so only the missing labels are created.
  const existingUnits = await repos.customUnits.findByLabId(labId);
  const existingLabels = new Set(existingUnits.map(u => u.label));
  for (const unit of dataset.customUnits) {
    if (existingLabels.has(unit.label)) continue;
    await repos.customUnits.create({
      id: unit.id,
      labId,
      label: unit.label,
      kind: unit.kind,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await upsertLocations(repos, labId, [...dataset.locations]);

  const categoryTimestamps = { createdAt: new Date(), updatedAt: new Date() };
  for (const category of flattenCategories(dataset.reagentCategories)) {
    await repos.reagentCategories.save(
      ReagentCategory.fromData({ ...category, labId, ...categoryTimestamps })
    );
  }
  for (const category of flattenCategories(dataset.supplyCategories)) {
    await repos.supplyCategories.save(
      SupplyCategory.fromData({ ...category, labId, ...categoryTimestamps })
    );
  }
  for (const category of flattenCategories(dataset.equipmentCategories)) {
    await repos.equipmentCategories.save(
      EquipmentCategory.fromData({ ...category, labId, ...categoryTimestamps })
    );
  }

  // PITFALL: researchers.person_id is NOT NULL, so persons land first.
  for (const person of dataset.people) {
    await repos.persons.save(
      Person.fromData({
        id: person.personId,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        position: person.position,
        department: person.department,
        createdAt: daysAgo(400),
        updatedAt: daysAgo(400),
      })
    );
    await repos.researchers.save(
      Researcher.fromData({
        id: person.researcherId,
        personId: person.personId,
        active: true,
        createdAt: daysAgo(400),
        source: 'admin',
        labId,
      })
    );
  }

  for (const donor of dataset.donors) {
    await repos.donors.save(
      Donor.fromData({
        id: donor.id,
        labId,
        donorSourceId: donor.donorSourceId,
        donorInternalId: donor.donorInternalId,
        species: donor.species,
        age: donor.age,
        sex: donor.sex,
        ethnicity: donor.ethnicity,
        clinicalStatus: donor.clinicalStatus,
        diagnosis: donor.diagnosis,
        diseaseStage: donor.diseaseStage,
        notes: donor.notes,
        isCurated: !donor.needsReview,
        isSeeded: true,
        createdAt: daysAgo(300),
        updatedAt: daysAgo(300),
      })
    );

    for (const collection of donor.collections) {
      await repos.donors.saveCollectionHistory(
        DonorCollectionHistory.fromData({
          id: collection.id,
          donorId: donor.id,
          collectionDate: dateOnly(daysAgo(collection.daysAgo)),
          specimenType: collection.specimenType,
          source: collection.source,
          createdAt: daysAgo(collection.daysAgo),
        })
      );
    }
  }

  // PITFALL: attribute values resolve by system_key, the one handle identical across environments.
  const definitions = await repos.attributes.findDefinitionsByLabId(labId);
  const options = await repos.attributes.findOptionsByLabId(labId);
  const definitionByKey = new Map(
    definitions.filter(d => d.systemKey).map(d => [d.systemKey as string, d])
  );

  // PITFALL: barcodes, documents, packaging and the stock ledger are insert-only, so they are written once per item; the reset clears items first.
  for (const reagent of dataset.reagents) {
    const isNewReagent = (await repos.reagentItems.findById(reagent.id, labId)) === null;
    await repos.reagentItems.save(
      ReagentItem.fromData({
        id: reagent.id,
        labId,
        categoryId: reagent.categoryId,
        name: reagent.name,
        manufacturer: reagent.manufacturer,
        catalogNumber: reagent.catalogNumber,
        vendorName: reagent.vendorName,
        stockUnit: reagent.stockUnit,
        reagentType: reagent.reagentType,
        casNumber: reagent.casNumber,
        concentration: reagent.concentration,
        concentrationUnit: reagent.concentrationUnit,
        expiryWarningDays: reagent.expiryWarningDays,
        reorderThreshold: reagent.reorderThreshold,
        unitPrice: reagent.unitPrice,
        description: reagent.description,
        status: reagent.status ?? 'active',
        isSeeded: true,
        createdAt: daysAgo(250),
        updatedAt: daysAgo(250),
      })
    );

    for (const attribute of reagent.attributes ?? []) {
      const definition = definitionByKey.get(attribute.systemKey);
      if (!definition) continue;

      const values = attribute.values
        .map(value => options.find(o => o.definitionId === definition.id && o.value === value))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map(option => ({
          id: `rattr_${reagent.id}_${option.id}`,
          itemId: reagent.id,
          definitionId: definition.id,
          valueOptionId: option.id,
        }));

      if (values.length > 0) {
        await repos.reagentItems.replaceAttributeValues(reagent.id, definition.id, values);
      }
    }

    if (isNewReagent) await seedNewReagent(repos, reagent, labId, demoUserId);
  }

  for (const supply of dataset.supplies) {
    const isNewSupply = (await repos.supplyItems.findById(supply.id, labId)) === null;
    await repos.supplyItems.save(
      SupplyItem.fromData({
        id: supply.id,
        labId,
        categoryId: supply.categoryId,
        name: supply.name,
        manufacturer: supply.manufacturer,
        catalogNumber: supply.catalogNumber,
        vendorName: supply.vendorName,
        stockUnit: supply.stockUnit,
        reorderThreshold: supply.reorderThreshold,
        unitPrice: supply.unitPrice,
        status: supply.status ?? 'active',
        isSeeded: true,
        createdAt: daysAgo(250),
        updatedAt: daysAgo(250),
      })
    );
    if (isNewSupply) await seedNewSupply(repos, supply, labId, demoUserId);
  }

  for (const item of dataset.equipment) {
    const isNewEquipment = (await repos.equipmentItems.findById(item.id, labId)) === null;
    const nextInDays = [...item.maintenance]
      .sort((a, b) => a.daysAgo - b.daysAgo)
      .find(entry => entry.nextInDays !== undefined)?.nextInDays;

    await repos.equipmentItems.save(
      EquipmentItem.fromData({
        id: item.id,
        labId,
        categoryId: item.categoryId,
        name: item.name,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serialNumber,
        assetTag: item.assetTag,
        locationId: item.locationRef,
        status: item.status,
        purchaseDate: item.purchaseDaysAgo ? dateOnly(daysAgo(item.purchaseDaysAgo)) : undefined,
        purchaseCost: item.purchaseCost,
        warrantyExpiration: item.warrantyExpiresInDays
          ? inDays(item.warrantyExpiresInDays)
          : undefined,
        nextMaintenanceDate: nextInDays === undefined ? undefined : inDays(nextInDays),
        decommissionDate: item.decommission
          ? dateOnly(daysAgo(item.decommission.daysAgo))
          : undefined,
        decommissionReason: item.decommission?.reason,
        isSeeded: true,
        createdAt: daysAgo(250),
        updatedAt: daysAgo(250),
      })
    );

    for (const entry of item.maintenance) {
      await repos.equipmentItems.saveMaintenanceEntry(
        EquipmentMaintenanceLog.fromData({
          id: entry.id,
          itemId: item.id,
          datePerformed: dateOnly(daysAgo(entry.daysAgo)),
          maintenanceType: entry.type,
          performedBy: entry.performedBy,
          technician: entry.technician,
          description: entry.description,
          nextScheduledDate: entry.nextInDays === undefined ? undefined : inDays(entry.nextInDays),
          cost: entry.cost,
          createdAt: daysAgo(entry.daysAgo),
          updatedAt: daysAgo(entry.daysAgo),
        })
      );
    }

    if (!isNewEquipment) continue;
    for (const document of item.documents ?? []) {
      await repos.equipmentItems.saveDocument(
        EquipmentDocument.create({ itemId: item.id, ...document })
      );
    }
  }

  const plans = planBoxes(config, dataset.tubeBatches.length);
  const donorsById = new Map(dataset.donors.map(d => [d.id, d]));
  const researcherByRef = new Map(dataset.people.map(p => [p.ref, p]));

  if (plans.length === 0) {
    throw new ValidationError(
      "This lab has no boxes to place tubes in. Seed the lab's storage before loading the demo " +
        'dataset — an empty demo is worse than one that refuses to load.'
    );
  }

  let totalTubes = 0;
  for (const plan of plans) {
    const boxTag = String(plan.ordinal).padStart(3, '0');
    let seatNumber = 0;

    for (const run of plan.runs) {
      const group = dataset.tubeBatches[run.groupIndex];
      const donor = donorsById.get(group.donorRef);
      const researcher = researcherByRef.get(group.researcherRef);
      const lock = group.lockNote
        ? {
            isLocked: true,
            lockedBy: demoUserId,
            lockNote: group.lockNote,
            lockedAt: daysAgo(TUBE_LOCKED_DAYS_AGO).toISOString(),
          }
        : {};

      for (const seat of run.seats) {
        seatNumber++;
        await repos.tubes.save(
          Tube.fromData({
            id: `tube_${group.batch}_${boxTag}_${String(seatNumber).padStart(3, '0')}`,
            location: seat.toData(),
            sample: {
              cellType: group.cellType,
              species: group.species,
              source: group.source,
              mediaType: group.mediaType,
              cultureCondition: group.cultureCondition,
              donorInternalId: donor?.donorInternalId,
              donorSourceId: donor?.donorSourceId,
              lotNumber: group.lotNumber,
              passageNumber: group.firstPassage,
              concentration: group.concentration,
              concentrationUnit: group.concentrationUnit,
              notes: group.notes,
            },
            researcherId: researcher?.researcherId,
            createdByName: researcher
              ? `${researcher.firstName} ${researcher.lastName}`
              : undefined,
            timestamps: { createdAt: daysAgo(200), updatedAt: daysAgo(200) },
            labId,
            isSeeded: true,
            ...lock,
          })
        );
        totalTubes++;
      }
    }
  }

  return {
    tubes: totalTubes,
    donors: dataset.donors.length,
    researchers: dataset.people.length,
    reagents: dataset.reagents.length,
    supplies: dataset.supplies.length,
    equipment: dataset.equipment.length,
  };
}
