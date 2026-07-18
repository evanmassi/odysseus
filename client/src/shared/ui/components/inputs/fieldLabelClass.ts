/**
 * Field Label Classes
 *
 * Shared field-label styles. COMPACT is the uppercase-mono micro-label for
 * Controller-wrapped Select/DatePicker fields (matches ValidatedInput's
 * `labelStyle="compact"`); STANDARD is the larger sentence-case label for
 * simple single-field modals. The *_ERROR variants recolor the same base for
 * invalid fields (used by ValidatedInput).
 */
const COMPACT_BASE = 'block type-label text-label-2xs tracking-label-wide mb-1.5';
const STANDARD_BASE = 'block text-body-sm font-medium mb-1';

export const FIELD_LABEL_COMPACT = `${COMPACT_BASE} text-muted-foreground`;
export const FIELD_LABEL_COMPACT_ERROR = `${COMPACT_BASE} text-danger-text`;
export const FIELD_LABEL_STANDARD = `${STANDARD_BASE} text-secondary-foreground`;
export const FIELD_LABEL_STANDARD_ERROR = `${STANDARD_BASE} text-danger-text`;
