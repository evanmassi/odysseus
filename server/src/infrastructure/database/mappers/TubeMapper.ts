import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';
import { Media } from '@domain/valueObjects/Media';

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
  media?: string;
  culture_condition?: string;
  lot_number?: string;
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
  version: number;
  is_locked?: boolean;
  locked_by?: string;
  lock_note?: string;
  locked_at?: Date | string;
  shared_with_user_ids?: string; // JSON array string
}

/**
 * TubeMapper - Clean conversion between Domain Entity and Database Row
 *
 * Handles all mapping logic without business rules.
 * Pure transformation functions.
 */
export class TubeMapper {

  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(tube: Tube): TubeRow {
    const location = tube.location;
    const sampleData = tube.sampleData;

    // Serialize media object to JSON string at database boundary
    const mediaData = sampleData.media;
    const mediaJson = mediaData ? JSON.stringify(mediaData) : undefined;

    // Serialize sharedWithUserIds array to JSON string
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
      media: mediaJson,
      culture_condition: sampleData.cultureCondition || undefined,
      lot_number: sampleData.lotNumber || undefined,
      notes: sampleData.notes || undefined,
      created_at: tube.createdAt,
      updated_at: tube.updatedAt,
      version: tube.version,
      is_locked: tube.isLocked,
      locked_by: tube.lockedBy,
      lock_note: tube.lockNote,
      locked_at: tube.lockedAt,
      shared_with_user_ids: sharedJson
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: TubeRow): Tube {
    // Create Location value object
    const location = Location.create(
      row.tank_id,
      row.rack_id,
      row.box_id,
      row.position
    );

    // Database-to-Domain Data Transformation Layer
    // Converts database nulls to TypeScript undefined for proper domain validation
    const concentration = row.concentration ? parseFloat(row.concentration) : undefined;
    const concentrationUnit = nullToUndefined(row.concentration_unit);

    // Ensure data consistency: if unit exists but no concentration, clear unit
    const validConcentrationUnit = (concentration !== undefined && concentrationUnit) ? concentrationUnit : undefined;

    // Deserialize media from JSON string at database boundary
    const mediaString = nullToUndefined(row.media);
    const media = mediaString ? Media.fromJsonString(mediaString) : undefined;

    const sampleData = SampleData.create({
      cellType: nullToUndefined(row.cell_type),
      donorInternalId: nullToUndefined(row.donor_internal_id),
      donorSourceId: nullToUndefined(row.donor_source_id),
      concentration,
      concentrationUnit: validConcentrationUnit,
      date: nullToUndefined(row.date),
      media: media?.toData(),
      cultureCondition: nullToUndefined(row.culture_condition),
      lotNumber: nullToUndefined(row.lot_number),
      notes: nullToUndefined(row.notes)
    });

    // Parse sharedWithUserIds JSON array
    const sharedWithUserIdsJson = nullToUndefined(row.shared_with_user_ids);
    const sharedWithUserIds: string[] = sharedWithUserIdsJson
      ? JSON.parse(sharedWithUserIdsJson)
      : [];

    // Handle date conversion from database
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;
    const updatedAt = row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at;
    const lockedAt = row.locked_at
      ? (row.locked_at instanceof Date ? row.locked_at.toISOString() : row.locked_at)
      : undefined;

    // Reconstruct Tube entity with nested structure
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
        donorInternalId: nullToUndefined(row.donor_internal_id),
        donorSourceId: nullToUndefined(row.donor_source_id),
        concentration: concentration,
        concentrationUnit: validConcentrationUnit,
        date: nullToUndefined(row.date),
        media: media?.toData(),
        cultureCondition: nullToUndefined(row.culture_condition),
        lotNumber: nullToUndefined(row.lot_number),
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
      sharedWithUserIds
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: TubeRow[]): Tube[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(tubes: Tube[]): TubeRow[] {
    return tubes.map(tube => this.toRow(tube));
  }
}
