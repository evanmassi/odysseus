import { Tube } from '@domain/entities/Tube';
import { Location } from '@domain/valueObjects/Location';
import { SampleData } from '@domain/valueObjects/SampleData';
import { Media } from '@domain/valueObjects/Media';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

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
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  cellType?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  concentration?: string;
  concentrationUnit?: 'c/v' | 'c/mL';
  date?: string;
  researcherId?: string;
  createdByName?: string;
  media?: string;
  cultureCondition?: string;
  lotNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Lock fields
  isLocked?: number; // SQLite uses 0/1 for boolean
  lockedBy?: string;
  lockNote?: string;
  lockedAt?: string;
  sharedWithUserIds?: string; // JSON array string
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
      tankId: location.tankId,
      rackId: location.rackId,
      boxId: location.boxId,
      position: location.position,
      cellType: sampleData.cellType || undefined,
      donorInternalId: sampleData.donorInternalId || undefined,
      donorSourceId: sampleData.donorSourceId || undefined,
      concentration: sampleData.concentration?.toString() || undefined,
      concentrationUnit: sampleData.concentrationUnit || undefined,
      date: sampleData.date || undefined,
      researcherId: tube.researcherId || undefined,
      createdByName: tube.createdByName || undefined,
      media: mediaJson,
      cultureCondition: sampleData.cultureCondition || undefined,
      lotNumber: sampleData.lotNumber || undefined,
      notes: sampleData.notes || undefined,
      createdAt: SqliteDateMapper.toDbDateTime(tube.createdAt),
      updatedAt: SqliteDateMapper.toDbDateTime(tube.updatedAt),
      // Lock fields
      isLocked: tube.isLocked ? 1 : 0,
      lockedBy: tube.lockedBy,
      lockNote: tube.lockNote,
      lockedAt: tube.lockedAt ? SqliteDateMapper.toDbDateTime(tube.lockedAt) : undefined,
      sharedWithUserIds: sharedJson
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: TubeRow): Tube {
    // Create Location value object
    const location = Location.create(
      row.tankId,
      row.rackId,
      row.boxId,
      row.position
    );

    // Database-to-Domain Data Transformation Layer
    // Converts database nulls to TypeScript undefined for proper domain validation
    const concentration = row.concentration ? parseFloat(row.concentration) : undefined;
    const concentrationUnit = nullToUndefined(row.concentrationUnit);
    
    // Ensure data consistency: if unit exists but no concentration, clear unit
    const validConcentrationUnit = (concentration !== undefined && concentrationUnit) ? concentrationUnit : undefined;
    
    // Deserialize media from JSON string at database boundary
    const mediaString = nullToUndefined(row.media);
    const media = mediaString ? Media.fromJsonString(mediaString) : undefined;
    
    const sampleData = SampleData.create({
      cellType: nullToUndefined(row.cellType),
      donorInternalId: nullToUndefined(row.donorInternalId),
      donorSourceId: nullToUndefined(row.donorSourceId),
      concentration,
      concentrationUnit: validConcentrationUnit,
      date: nullToUndefined(row.date),
      media: media?.toData(),
      cultureCondition: nullToUndefined(row.cultureCondition),
      lotNumber: nullToUndefined(row.lotNumber),
      notes: nullToUndefined(row.notes)
    });

    // Parse sharedWithUserIds JSON array
    const sharedWithUserIdsJson = nullToUndefined(row.sharedWithUserIds);
    const sharedWithUserIds: string[] = sharedWithUserIdsJson
      ? JSON.parse(sharedWithUserIdsJson)
      : [];

    // Reconstruct Tube entity with nested structure
    return Tube.fromData({
      id: row.id,
      location: {
        tankId: row.tankId,
        rackId: row.rackId,
        boxId: row.boxId,
        position: row.position
      },
      sample: {
        cellType: nullToUndefined(row.cellType),
        donorInternalId: nullToUndefined(row.donorInternalId),
        donorSourceId: nullToUndefined(row.donorSourceId),
        concentration: concentration,
        concentrationUnit: validConcentrationUnit,
        date: nullToUndefined(row.date),
        media: media?.toData(),
        cultureCondition: nullToUndefined(row.cultureCondition),
        lotNumber: nullToUndefined(row.lotNumber),
        notes: nullToUndefined(row.notes)
      },
      researcherId: nullToUndefined(row.researcherId),
      createdByName: nullToUndefined(row.createdByName),
      timestamps: {
        createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!.toISOString(),
        updatedAt: SqliteDateMapper.fromDbDateTime(row.updatedAt)!.toISOString()
      },
      // Lock fields
      isLocked: row.isLocked === 1,
      lockedBy: nullToUndefined(row.lockedBy),
      lockNote: nullToUndefined(row.lockNote),
      lockedAt: row.lockedAt ? SqliteDateMapper.fromDbDateTime(row.lockedAt)?.toISOString() : undefined,
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
