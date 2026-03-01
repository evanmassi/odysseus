import { Lab } from '@domain/entities/Lab';
import type { DemoLimits } from '@odysseus/shared-schemas';

export interface LabRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_demo: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  demo_limits?: DemoLimits | null;
}

export class LabMapper {

  static toRow(lab: Lab): LabRow {
    const data = lab.toData();
    return {
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      is_active: lab.isActive,
      is_demo: lab.isDemo,
      created_at: lab.createdAt.toISOString(),
      updated_at: lab.updatedAt.toISOString(),
      demo_limits: data.demoLimits ?? null,
    };
  }

  static fromRow(row: LabRow): Lab {
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;
    const updatedAt = row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at;

    return Lab.fromData({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.is_active,
      isDemo: row.is_demo,
      createdAt,
      updatedAt,
      demoLimits: row.demo_limits ?? undefined,
    });
  }

  static fromRows(rows: LabRow[]): Lab[] {
    return rows.map(row => this.fromRow(row));
  }

  static toRows(labs: Lab[]): LabRow[] {
    return labs.map(lab => this.toRow(lab));
  }
}
