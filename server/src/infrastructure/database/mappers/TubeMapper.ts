import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/value-objects/Location';
import { SampleData } from '@domain/value-objects/SampleData';

/**
 * Database-to-Domain transformation utility
 * Converts SQL NULL values to TypeScript undefined for proper optional handling
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Database row structure for tubes table
 */
export interface TubeRow {
  id: string;
  tank_id: string;
  rack_id: string;
  box_id: string;
  position: number;
  cell_type?: string;
  donor_internal_id?: string;
  donor_source_id?: string;
  concentration?: string;
  concentration_unit?: 'c/v' | 'c/mL';
  date?: string;
  researcher_id?: string;
  created_by_name?: string;
  media_type?: string;
  media_supplements?: string;
  media_selection?: string;
  culture_condition?: string;
  lot_number?: string;
  species?: string;
  source?: string;
  catalog_number?: string;
  passage_number?: number;
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
  version: number;
  is_locked?: boolean;
  locked_by?: string;
  lock_note?: string;
  locked_at?: Date | string;
  shared_with_user_ids?: string; // JSON array string
  lab_id?: string;
}

/**
 * TubeMapper - Clean conversion between Domain Entity and Database Row
 *
 * Handles all mapping logic without business rules.
 * Pure transformation functions.
 */
export class TubeMapper {

  static toRow(tube: Tube): TubeRow {
    const location = tube.location;
    const sampleData = tube.sampleData;

    const sharedWithUserIds = tube.sharedWithUserIds;
    const sharedJson = sharedWithUserIds.length > 0 ? JSON.stringify(sharedWithUserIds) : undefined;

    return {
      id: tube.id,
      tank_id: location.tankId,
      rack_id: location.rackId,
      box_id: location.boxId,
      position: location.position,
      cell_type: sampleData.cellType || undefined,
      donor_internal_id: sampleData.donorInternalId || undefined,
      donor_source_id: sampleData.donorSourceId || undefined,
      concentration: sampleData.concentration?.toString() || undefined,
      concentration_unit: sampleData.concentrationUnit || undefined,
      date: sampleData.date || undefined,
      researcher_id: tube.researcherId || undefined,
      created_by_name: tube.createdByName || undefined,
      media_type: sampleData.mediaType || undefined,
      media_supplements: sampleData.mediaSupplements || undefined,
      media_selection: sampleData.mediaSelection || undefined,
      culture_condition: sampleData.cultureCondition || undefined,
      lot_number: sampleData.lotNumber || undefined,
      species: sampleData.species || undefined,
      source: sampleData.source || undefined,
      catalog_number: sampleData.catalogNumber || undefined,
      passage_number: sampleData.passageNumber ?? undefined,
      notes: sampleData.notes || undefined,
      created_at: tube.createdAt,
      updated_at: tube.updatedAt,
      version: tube.version,
      is_locked: tube.isLocked,
      locked_by: tube.lockedBy,
      lock_note: tube.lockNote,
      locked_at: tube.lockedAt,
      shared_with_user_ids: sharedJson,
      lab_id: tube.labId
    };
  }

  static fromRow(row: TubeRow): Tube {
    const location = Location.create(
      row.tank_id,
      row.rack_id,
      row.box_id,
      row.position
    );

    const concentration = row.concentration ? parseFloat(row.concentration) : undefined;
    const concentrationUnit = nullToUndefined(row.concentration_unit);
    const validConcentrationUnit = (concentration !== undefined && concentrationUnit) ? concentrationUnit : undefined;

    const sampleData = SampleData.create({
      cellType: nullToUndefined(row.cell_type),
      species: nullToUndefined(row.species),
      donorInternalId: nullToUndefined(row.donor_internal_id),
      donorSourceId: nullToUndefined(row.donor_source_id),
      concentration,
      concentrationUnit: validConcentrationUnit,
      date: nullToUndefined(row.date),
      mediaType: nullToUndefined(row.media_type),
      mediaSupplements: nullToUndefined(row.media_supplements),
      mediaSelection: nullToUndefined(row.media_selection),
      cultureCondition: nullToUndefined(row.culture_condition),
      lotNumber: nullToUndefined(row.lot_number),
      source: nullToUndefined(row.source),
      catalogNumber: nullToUndefined(row.catalog_number),
      passageNumber: nullToUndefined(row.passage_number),
      notes: nullToUndefined(row.notes)
    });

    const sharedWithUserIdsJson = nullToUndefined(row.shared_with_user_ids);
    const sharedWithUserIds: string[] = sharedWithUserIdsJson
      ? JSON.parse(sharedWithUserIdsJson)
      : [];

    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;
    const updatedAt = row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at;
    const lockedAt = row.locked_at
      ? (row.locked_at instanceof Date ? row.locked_at.toISOString() : row.locked_at)
      : undefined;

    return Tube.fromData({
      id: row.id,
      location: {
        tankId: row.tank_id,
        rackId: row.rack_id,
        boxId: row.box_id,
        position: row.position
      },
      sample: {
        cellType: nullToUndefined(row.cell_type),
        species: nullToUndefined(row.species),
        donorInternalId: nullToUndefined(row.donor_internal_id),
        donorSourceId: nullToUndefined(row.donor_source_id),
        concentration: concentration,
        concentrationUnit: validConcentrationUnit,
        date: nullToUndefined(row.date),
        mediaType: nullToUndefined(row.media_type),
        mediaSupplements: nullToUndefined(row.media_supplements),
        mediaSelection: nullToUndefined(row.media_selection),
        cultureCondition: nullToUndefined(row.culture_condition),
        lotNumber: nullToUndefined(row.lot_number),
        source: nullToUndefined(row.source),
        catalogNumber: nullToUndefined(row.catalog_number),
        passageNumber: nullToUndefined(row.passage_number),
        notes: nullToUndefined(row.notes)
      },
      researcherId: nullToUndefined(row.researcher_id),
      createdByName: nullToUndefined(row.created_by_name),
      timestamps: {
        createdAt,
        updatedAt
      },
      version: row.version,
      isLocked: row.is_locked === true,
      lockedBy: nullToUndefined(row.locked_by),
      lockNote: nullToUndefined(row.lock_note),
      lockedAt,
      sharedWithUserIds,
      labId: row.lab_id
    });
  }

  static fromRows(rows: TubeRow[]): Tube[] {
    return rows.map(row => this.fromRow(row));
  }

  static toRows(tubes: Tube[]): TubeRow[] {
    return tubes.map(tube => this.toRow(tube));
  }
}
