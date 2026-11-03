import type { Tube } from '@domain/entities/Tube';

import type { TUBE_SORT_FIELDS } from '@odysseus/shared-schemas';

export interface TubeSearchResult {
  tubes: Tube[];
  matchedTerms: string[];
}

export interface TubeSearchCriteria {
  query?: string;

  tankIds?: string[];
  rackIds?: string[];
  boxIds?: string[];

  tankId?: string;
  rackId?: string;
  boxId?: string;

  cellTypes?: string[];
  species?: string[];
  sources?: string[];
  lotNumbers?: string[];
  donorInternalIds?: string[];
  donorSourceIds?: string[];
  cultureConditions?: string[];

  cellType?: string;
  researcher?: string;
  donorInternalId?: string;
  donorSourceId?: string;

  researcherIds?: string[];

  // PITFALL: date-only fields are YYYY-MM-DD strings; the created* bounds are Dates.
  dateFrom?: string;
  dateTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;

  hasConcentration?: boolean;
  isComplete?: boolean;

  limit?: number;
  offset?: number;

  sortBy?: (typeof TUBE_SORT_FIELDS)[number];
  sortOrder?: 'asc' | 'desc';
}
