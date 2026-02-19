/**
 * Export Service
 *
 * Handles data export operations for admin users.
 * Transforms domain data into export-friendly formats (CSV/JSON).
 */

import { TubeRepository } from '@domain/repositories/TubeRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';
import { generateCsv, formatDateForCsv, formatDateShort } from '@infrastructure/utils/csvGenerator';
import { logger } from '@utils/logger';

/** Flattened tube data for export */
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

/** User data for export (excludes sensitive fields) */
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

/** Researcher data for export */
interface ResearcherExportRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  active: string;
  approvalStatus: string;
  tubeCount: number;
  linkedUserId: string;
  createdAt: string;
}

/** System backup structure */
interface SystemBackup {
  exportedAt: string;
  version: string;
  configuration: unknown;
  securityConfig: unknown;
}

export class ExportService {
  constructor(
    private tubeRepository: TubeRepository,
    private userRepository: UserRepository,
    private researcherRepository: ResearcherRepository,
    private personRepository: PersonRepository,
    private configurationRepository: ConfigurationRepository
  ) {}

  /**
   * Export all tubes with researcher names resolved
   */
  async exportTubes(format: 'csv' | 'json'): Promise<string | object[]> {
    logger.info('[ExportService] Exporting tubes', { format });

    const tubes = await this.tubeRepository.findAll();

    // Build researcher lookup map
    const researcherIds = [...new Set(tubes.map(t => t.researcherId).filter(Boolean))] as string[];
    const researchers = await this.researcherRepository.findByIds(researcherIds);

    // Get person data for researcher names
    const personIds = researchers.map(r => r.personId);
    const persons = await this.personRepository.findByIds(personIds);
    const personMap = new Map(persons.map(p => [p.id, p]));

    // Build researcher name map
    const researcherNameMap = new Map<string, string>();
    for (const researcher of researchers) {
      const person = personMap.get(researcher.personId);
      if (person) {
        researcherNameMap.set(researcher.id, person.fullName);
      }
    }

    // Transform to export format
    const exportData: TubeExportRow[] = tubes.map(tube => ({
      id: tube.id,
      tankId: tube.tankId,
      rackId: tube.rackId,
      boxId: tube.boxId,
      position: tube.position,
      researcherId: tube.researcherId ?? '',
      researcherName: tube.researcherId ? (researcherNameMap.get(tube.researcherId) ?? '') : '',
      cellType: tube.sample.cellType ?? '',
      donorInternalId: tube.sample.donorInternalId ?? '',
      donorSourceId: tube.sample.donorSourceId ?? '',
      concentration: tube.sample.concentration?.toString() ?? '',
      concentrationUnit: tube.sample.concentrationUnit ?? '',
      date: tube.sample.date ?? '',
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
      updatedAt: formatDateForCsv(tube.updatedAt)
    }));

    if (format === 'json') {
      return exportData;
    }

    // CSV with friendly column headers
    return generateCsv(exportData, [
      { key: 'id', header: 'ID' },
      { key: 'tankId', header: 'Tank' },
      { key: 'rackId', header: 'Rack' },
      { key: 'boxId', header: 'Box' },
      { key: 'position', header: 'Position' },
      { key: 'researcherName', header: 'Researcher' },
      { key: 'cellType', header: 'Cell Type' },
      { key: 'donorInternalId', header: 'Donor Internal ID' },
      { key: 'donorSourceId', header: 'Donor Source ID' },
      { key: 'concentration', header: 'Concentration' },
      { key: 'concentrationUnit', header: 'Concentration Unit' },
      { key: 'date', header: 'Date' },
      { key: 'media', header: 'Media' },
      { key: 'cultureCondition', header: 'Culture Condition' },
      { key: 'species', header: 'Species' },
      { key: 'source', header: 'Source' },
      { key: 'catalogNumber', header: 'Catalog Number' },
      { key: 'passageNumber', header: 'Passage Number' },
      { key: 'lotNumber', header: 'Lot Number' },
      { key: 'notes', header: 'Notes' },
      { key: 'isLocked', header: 'Locked' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' }
    ]);
  }

  /**
   * Export all users (excludes sensitive data like passwords)
   */
  async exportUsers(format: 'csv' | 'json'): Promise<string | object[]> {
    logger.info('[ExportService] Exporting users', { format });

    const users = await this.userRepository.findAll();

    // Get person data for names and emails
    const personIds = users.map(u => u.personId).filter(Boolean) as string[];
    const persons = await this.personRepository.findByIds(personIds);
    const personMap = new Map(persons.map(p => [p.id, p]));

    // Transform to export format
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
        researcherId: user.researcherId ?? ''
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
      { key: 'researcherId', header: 'Linked Researcher ID' }
    ]);
  }

  /**
   * Export all researchers with tube counts
   */
  async exportResearchers(format: 'csv' | 'json'): Promise<string | object[]> {
    logger.info('[ExportService] Exporting researchers', { format });

    const researchers = await this.researcherRepository.findAll();

    // Get person data
    const personIds = researchers.map(r => r.personId);
    const persons = await this.personRepository.findByIds(personIds);
    const personMap = new Map(persons.map(p => [p.id, p]));

    // Get linked users
    const users = await this.userRepository.findAll();
    const userByResearcherId = new Map<string, string>();
    for (const user of users) {
      if (user.researcherId) {
        userByResearcherId.set(user.researcherId, user.id);
      }
    }

    // Get tube counts
    const tubeCounts = new Map<string, number>();
    for (const researcher of researchers) {
      const count = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
      tubeCounts.set(researcher.id, count);
    }

    // Transform to export format
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
        approvalStatus: researcher.approvalStatus,
        tubeCount: tubeCounts.get(researcher.id) ?? 0,
        linkedUserId: userByResearcherId.get(researcher.id) ?? '',
        createdAt: formatDateForCsv(researcher.createdAt)
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
      { key: 'approvalStatus', header: 'Approval Status' },
      { key: 'tubeCount', header: 'Tube Count' },
      { key: 'linkedUserId', header: 'Linked User ID' },
      { key: 'createdAt', header: 'Created At' }
    ]);
  }

  /**
   * Export system configuration and settings for backup
   * Always returns JSON (structure too complex for CSV)
   */
  async exportSystemBackup(): Promise<SystemBackup> {
    logger.info('[ExportService] Exporting system backup');

    const configuration = await this.configurationRepository.getCurrent();
    const securityConfig = await this.configurationRepository.getSecurityConfig();

    return {
      exportedAt: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      configuration: configuration ? {
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
                assignedUserId: b.assignedUserId
              }))
            }))
          }))
        }
      } : null,
      securityConfig: securityConfig ?? null
    };
  }
}
