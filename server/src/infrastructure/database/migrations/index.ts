/**
 * Migration Index
 *
 * Ordered array of all migrations. The runner executes them sequentially by ID.
 */

import { migration001 } from './001_initial_schema';
import { migration002 } from './002_rename_configuration_to_storage';
import { migration003 } from './003_rename_vendor_to_source';
import { migration004 } from './004_add_tube_columns';
import { migration005 } from './005_flatten_media_json';
import { migration006 } from './006_update_lookup_category_constraint';
import { migration007 } from './007_drop_users_is_demo';
import { migration008 } from './008_create_indexes';
import { migration009 } from './009_create_full_text_search';
import { migration010 } from './010_multi_tenancy';
import { migration011 } from './011_user_status_constraint';
import { migration012 } from './012_migrate_equipment_ids';
import { migration013 } from './013_normalize_lab_ids';
import { migration014 } from './014_ensure_system_admin_person';
import { migration015 } from './015_insert_default_configuration';
import { migration016 } from './016_create_donors';
import { migration017 } from './017_enhance_search_vector';
import { migration018 } from './018_add_invite_code_columns';
import { migration019 } from './019_nullable_person_email';
import { migration020 } from './020_create_equipment';
import { migration021 } from './021_create_supplies';
import { migration022 } from './022_nullable_audit_log_user_id';
import { migration023 } from './023_hash_refresh_tokens';
import { migration024 } from './024_drop_dead_logging_flags';
import { migration025 } from './025_drop_user_approval_statuses';
import { migration026 } from './026_drop_researcher_approval_status';
import { migration027 } from './027_create_reagents';
import { migration028 } from './028_add_document_type';
import { migration029 } from './029_merge_vendor_manufacturer';

import type { Migration } from './migrationRunner';

export const ALL_MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
  migration017,
  migration018,
  migration019,
  migration020,
  migration021,
  migration022,
  migration023,
  migration024,
  migration025,
  migration026,
  migration027,
  migration028,
  migration029,
];
