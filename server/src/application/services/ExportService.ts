/**
 * Data Export Service
 *
 * Transforms domain data into CSV/JSON export formats for admin users.
 */

import type { EquipmentCategory } from '@domain/entities/EquipmentCategory';
import type { Person } from '@domain/entities/Person';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { EquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { LocationRepository } from '@domain/repositories/LocationRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { SupplyItemRepository } from '@domain/repositories/SupplyItemRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { logger } from '@infrastructure/logging/logger';
import { generateCsv, formatDateForCsv } from '@infrastructure/utils/csvGenerator';

function formatConcentration(value: number | undefined): string {
  if (value === undefined) return '';
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e9) {
    return value.toExponential();
  }
  return value.toString();
}

interface TubeExportRow {
  id: string;
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  researcherId: string;
  researcherName: string;
  cellType: string;
  donorInternalId: string;
  donorSourceId: string;
  concentration: string;
  concentrationUnit: string;
  date: string;
  media: string;
  cultureCondition: string;
  species: string;
  source: string;
  catalogNumber: string;
  passageNumber: string;
  lotNumber: string;
  notes: string;
  isLocked: string;
  lockedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface UserExportRow {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: string;
  createdAt: string;
  researcherId: string;
}

interface ResearcherExportRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  active: string;
  tubeCount: number;
  linkedUserId: string;
  createdAt: string;
}

interface EquipmentExportRow {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: string;
  location: string;
  assetTag: string;
  description: string;
  conditionNotes: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiration: string;
  nextMaintenanceDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplyReorderExportRow {
  name: string;
  manufacturer: string;
  catalogNumber: string;
  vendorName: string;
  vendorCatalogNumber: string;
  currentStock: number;
  reorderQuantity: number;
  reorderUnit: string;
  unitPrice: number;
}

interface SystemBackup {
  exportedAt: string;
  version: string;
  configuration: unknown;
  securityConfig: unknown;
}

/**
 * Full "Room 204 > Cold Room > Shelf 2" path per node id. Walks to the root rather than
 * naming one parent, so a location three tiers deep exports its whole path; the loop
 * bound is a cycle backstop.
 */
function buildPathMap<T extends { id: string; name: string; parentId?: string }>(
  nodes: T[]
): Map<string, string> {
  const byId = new Map(nodes.map(node => [node.id, node]));

  return new Map(
    nodes.map(node => {
      const segments: string[] = [];
      let current: T | undefined = node;
      while (current && segments.length <= byId.size) {
        segments.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return [node.id, segments.join(' > ')];
    })
  );
}

export class ExportService {
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository,
    private storageRepository: StorageRepository,
    private appVersion: string,
    private equipmentItemRepository: EquipmentItemRepository,
    private equipmentCategoryRepository: CategoryRepository<EquipmentCategory>,
    private supplyItemRepository: SupplyItemRepository,
    private locationRepository: LocationRepository
  ) {}

  async exportTubes(labId: string, format: 'csv'): Promise<string>;
  async exportTubes(labId: string, format: 'json'): Promise<TubeExportRow[]>;
  async exportTubes(labId: string, format: 'csv' | 'json'): Promise<string | TubeExportRow[]> {
    logger.info('[ExportService] Exporting tubes', { format, labId });

    const tubes = await this.tubeRepository.findAllByLabId(labId);
    const storageConfig = await this.storageRepository.getForLab(labId);

    const researcherIds = [...new Set(tubes.map(t => t.researcherId).filter(Boolean))] as string[];
    const researchers = await this.researcherRepository.findByIds(researcherIds, labId);
    const personMap = await this.buildPersonMap(researchers.map(r => r.personId));

    const researcherNameMap = new Map<string, string>();
    for (const researcher of researchers) {
      const person = personMap.get(researcher.personId);
      if (person) {
        researcherNameMap.set(researcher.id, person.fullName);
      }
    }

    const tankNameMap = new Map<string, string>();
    const rackNameMap = new Map<string, string>();
    if (storageConfig) {
      for (const tank of storageConfig.equipment.tanks) {
        tankNameMap.set(tank.id, tank.name);
        for (const rack of tank.racks) {
          rackNameMap.set(rack.id, rack.name);
        }
      }
    }

    const exportData: TubeExportRow[] = tubes.map(tube => ({
      id: tube.id,
      tankId: tankNameMap.get(tube.location.tankId) ?? tube.location.tankId,
      rackId: rackNameMap.get(tube.location.rackId) ?? tube.location.rackId,
      boxId: tube.location.boxId,
      position: tube.location.position,
      researcherId: tube.researcherId ?? '',
      researcherName: tube.researcherId ? (researcherNameMap.get(tube.researcherId) ?? '') : '',
      cellType: tube.sample.cellType ?? '',
      donorInternalId: tube.sample.donorInternalId ?? '',
      donorSourceId: tube.sample.donorSourceId ?? '',
      concentration: formatConcentration(tube.sample.concentration),
      concentrationUnit: tube.sample.concentrationUnit ?? '',
      date: formatDateForCsv(tube.sample.date),
      media: tube.sample.mediaType ?? '',
      cultureCondition: tube.sample.cultureCondition ?? '',
      species: tube.sample.species ?? '',
      source: tube.sample.source ?? '',
      catalogNumber: tube.sample.catalogNumber ?? '',
      passageNumber: tube.sample.passageNumber?.toString() ?? '',
      lotNumber: tube.sample.lotNumber ?? '',
      notes: tube.sample.notes ?? '',
      isLocked: tube.isLocked ? 'Yes' : 'No',
      lockedBy: tube.lockedBy ?? '',
      createdAt: formatDateForCsv(tube.createdAt),
      updatedAt: formatDateForCsv(tube.updatedAt),
    }));

    if (format === 'json') {
      return exportData;
    }

    return generateCsv(exportData, [
      { key: 'id', header: 'ID' },
      { key: 'tankId', header: 'Tank' },
      { key: 'rackId', header: 'Rack' },
      { key: 'boxId', header: 'Box' },
      { key: 'position', header: 'Position' },
      { key: 'researcherName', header: 'Researcher' },
      { key: 'cellType', header: 'Cell Type' },
      { key: 'donorInternalId', header: 'Donor Internal ID', forceText: true },
      { key: 'donorSourceId', header: 'Donor Source ID', forceText: true },
      { key: 'concentration', header: 'Concentration' },
      { key: 'concentrationUnit', header: 'Concentration Unit' },
      { key: 'date', header: 'Date' },
      { key: 'media', header: 'Media' },
      { key: 'cultureCondition', header: 'Culture Condition', forceText: true },
      { key: 'species', header: 'Species' },
      { key: 'source', header: 'Source' },
      { key: 'catalogNumber', header: 'Catalog Number' },
      { key: 'passageNumber', header: 'Passage Number' },
      { key: 'lotNumber', header: 'Lot Number' },
      { key: 'notes', header: 'Notes' },
      { key: 'isLocked', header: 'Locked' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' },
    ]);
  }

  async exportUsers(labId: string, format: 'csv'): Promise<string>;
  async exportUsers(labId: string, format: 'json'): Promise<UserExportRow[]>;
  async exportUsers(labId: string, format: 'csv' | 'json'): Promise<string | UserExportRow[]> {
    logger.info('[ExportService] Exporting users', { format, labId });

    const users = await this.userRepository.findByLabId(labId);
    const personIds = users.map(u => u.personId).filter(Boolean) as string[];
    const personMap = await this.buildPersonMap(personIds);

    const exportData: UserExportRow[] = users.map(user => {
      const person = user.personId ? personMap.get(user.personId) : undefined;
      return {
        id: user.id,
        username: user.username,
        email: person?.email ?? '',
        firstName: person?.firstName ?? '',
        lastName: person?.lastName ?? '',
        role: String(user.role),
        status: String(user.status),
        emailVerified: user.emailVerified ? 'Yes' : 'No',
        createdAt: formatDateForCsv(user.createdAt),
        researcherId: user.researcherId ?? '',
      };
    });

    if (format === 'json') {
      return exportData;
    }

    return generateCsv(exportData, [
      { key: 'id', header: 'ID' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'role', header: 'Role' },
      { key: 'status', header: 'Status' },
      { key: 'emailVerified', header: 'Email Verified' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'researcherId', header: 'Linked Researcher ID' },
    ]);
  }

  async exportResearchers(labId: string, format: 'csv'): Promise<string>;
  async exportResearchers(labId: string, format: 'json'): Promise<ResearcherExportRow[]>;
  async exportResearchers(
    labId: string,
    format: 'csv' | 'json'
  ): Promise<string | ResearcherExportRow[]> {
    logger.info('[ExportService] Exporting researchers', { format, labId });

    const researchers = await this.researcherRepository.findByLabId(labId);
    const personMap = await this.buildPersonMap(researchers.map(r => r.personId));

    const users = await this.userRepository.findByLabId(labId);
    const userByResearcherId = new Map<string, string>();
    for (const user of users) {
      if (user.researcherId) {
        userByResearcherId.set(user.researcherId, user.id);
      }
    }

    const tubeCounts = await this.researcherRepository.getTubeCountsByResearcherIds(
      researchers.map(r => r.id)
    );

    const exportData: ResearcherExportRow[] = researchers.map(researcher => {
      const person = personMap.get(researcher.personId);
      return {
        id: researcher.id,
        firstName: person?.firstName ?? '',
        lastName: person?.lastName ?? '',
        email: person?.email ?? '',
        position: person?.position ?? '',
        department: person?.department ?? '',
        active: researcher.active ? 'Yes' : 'No',
        tubeCount: tubeCounts.get(researcher.id) ?? 0,
        linkedUserId: userByResearcherId.get(researcher.id) ?? '',
        createdAt: formatDateForCsv(researcher.createdAt),
      };
    });

    if (format === 'json') {
      return exportData;
    }

    return generateCsv(exportData, [
      { key: 'id', header: 'ID' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'email', header: 'Email' },
      { key: 'position', header: 'Position' },
      { key: 'department', header: 'Department' },
      { key: 'active', header: 'Active' },
      { key: 'tubeCount', header: 'Tube Count' },
      { key: 'linkedUserId', header: 'Linked User ID' },
      { key: 'createdAt', header: 'Created At' },
    ]);
  }

  async exportEquipment(labId: string, format: 'csv'): Promise<string>;
  async exportEquipment(labId: string, format: 'json'): Promise<EquipmentExportRow[]>;
  async exportEquipment(
    labId: string,
    format: 'csv' | 'json'
  ): Promise<string | EquipmentExportRow[]> {
    logger.info('[ExportService] Exporting equipment', { labId, format });

    const items = await this.equipmentItemRepository.findByLabId(labId);
    const categories = await this.equipmentCategoryRepository.findByLabId(labId);
    const locations = await this.locationRepository.findByLabId(labId);

    const categoryMap = buildPathMap(categories);
    const locationMap = buildPathMap(locations);

    const rows: EquipmentExportRow[] = items.map(item => ({
      id: item.id,
      name: item.name,
      category: categoryMap.get(item.categoryId) ?? '',
      serialNumber: item.serialNumber ?? '',
      manufacturer: item.manufacturer ?? '',
      model: item.model ?? '',
      status: item.status,
      location: item.locationId ? (locationMap.get(item.locationId) ?? '') : '',
      assetTag: item.assetTag ?? '',
      description: item.description ?? '',
      conditionNotes: item.conditionNotes ?? '',
      purchaseDate: formatDateForCsv(item.purchaseDate),
      purchaseCost: item.purchaseCost !== undefined ? item.purchaseCost.toString() : '',
      warrantyExpiration: formatDateForCsv(item.warrantyExpiration),
      nextMaintenanceDate: formatDateForCsv(item.nextMaintenanceDate),
      notes: item.notes ?? '',
      createdAt: formatDateForCsv(item.createdAt),
      updatedAt: formatDateForCsv(item.updatedAt),
    }));

    if (format === 'json') return rows;

    return generateCsv(rows, [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'category', header: 'Category' },
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'model', header: 'Model' },
      { key: 'status', header: 'Status' },
      { key: 'location', header: 'Location' },
      { key: 'assetTag', header: 'Asset Tag' },
      { key: 'description', header: 'Description' },
      { key: 'conditionNotes', header: 'Condition Notes' },
      { key: 'purchaseDate', header: 'Purchase Date' },
      { key: 'purchaseCost', header: 'Purchase Cost' },
      { key: 'warrantyExpiration', header: 'Warranty Expiration' },
      { key: 'nextMaintenanceDate', header: 'Next Maintenance Date' },
      { key: 'notes', header: 'Notes' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' },
    ]);
  }

  /** Always JSON — structure too complex for CSV. */
  async exportSystemBackup(labId: string): Promise<SystemBackup> {
    logger.info('[ExportService] Exporting system backup', { labId });

    const configuration = await this.storageRepository.getForLab(labId);
    const securityConfig = await this.storageRepository.getSecurityConfig();

    return {
      exportedAt: new Date().toISOString(),
      version: this.appVersion,
      configuration: configuration
        ? {
            version: configuration.version,
            systemSettings: configuration.systemSettings,
            equipment: {
              tanks: configuration.equipment.tanks.map(t => ({
                id: t.id,
                name: t.name,
                location: t.location,
                isActive: t.isActive,
                racks: t.racks.map(r => ({
                  id: r.id,
                  name: r.name,
                  capacity: r.capacity,
                  isActive: r.isActive,
                  customLabel: r.customLabel,
                  assignedUserId: r.assignedUserId,
                  boxes: r.boxes.map(b => ({
                    id: b.name,
                    name: b.name,
                    gridConfig: b.gridConfig,
                    positionDisplay: b.positionDisplay,
                    isActive: b.isActive,
                    customLabel: b.customLabel,
                    assignedUserId: b.assignedUserId,
                  })),
                })),
              })),
            },
          }
        : null,
      securityConfig: securityConfig ?? null,
    };
  }

  async exportSupplyReorderList(labId: string, format: 'csv'): Promise<string>;
  async exportSupplyReorderList(labId: string, format: 'json'): Promise<SupplyReorderExportRow[]>;
  async exportSupplyReorderList(
    labId: string,
    format: 'csv' | 'json'
  ): Promise<string | SupplyReorderExportRow[]> {
    logger.info('[ExportService] Exporting supply reorder list', { labId, format });

    const itemsWithStock = await this.supplyItemRepository.findItemsAtOrBelowThreshold(labId);

    const rows: SupplyReorderExportRow[] = itemsWithStock.map(({ item, totalStock }) => ({
      name: item.name,
      manufacturer: item.manufacturer ?? '',
      catalogNumber: item.catalogNumber ?? '',
      vendorName: item.vendorName ?? '',
      vendorCatalogNumber: item.vendorCatalogNumber ?? '',
      currentStock: totalStock,
      reorderQuantity: item.reorderQuantity ?? 0,
      reorderUnit: item.reorderUnit ?? item.stockUnit ?? '',
      unitPrice: item.unitPrice ?? 0,
    }));

    if (format === 'json') return rows;

    return generateCsv(rows, [
      { key: 'name', header: 'Item Name' },
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'catalogNumber', header: 'Catalog #' },
      { key: 'vendorName', header: 'Vendor' },
      { key: 'vendorCatalogNumber', header: 'Vendor Catalog #' },
      { key: 'currentStock', header: 'Current Stock' },
      { key: 'reorderQuantity', header: 'Reorder Qty' },
      { key: 'reorderUnit', header: 'Reorder Unit' },
      { key: 'unitPrice', header: 'Unit Price' },
    ]);
  }

  private async buildPersonMap(personIds: string[]): Promise<Map<string, Person>> {
    const persons = await this.personRepository.findByIds(personIds);
    return new Map(persons.map(p => [p.id, p]));
  }
}
