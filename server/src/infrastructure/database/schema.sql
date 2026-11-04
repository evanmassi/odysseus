-- PITFALL: reference only, never executed; migrations own all DDL. Regenerate with pg_dump --schema-only from a freshly migrated database.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE FUNCTION normalize_identifier(input text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      BEGIN
        IF input IS NULL OR input = '' THEN
          RETURN '';
        END IF;
        RETURN lower(regexp_replace(input, '[^a-zA-Z0-9]', '', 'g'));
      END
      $$;

CREATE FUNCTION tubes_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.cell_type, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.donor_internal_id, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.donor_source_id, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.species, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.lot_number, ''))), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_type, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.catalog_number, '')), 'B') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.catalog_number, ''))), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.culture_condition, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.concentration, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.created_by_name, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_supplements, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_selection, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.passage_number::TEXT, '')), 'C');
        RETURN NEW;
      END
      $$;

CREATE TABLE attribute_definitions (
    id text NOT NULL,
    lab_id text NOT NULL,
    name text NOT NULL,
    value_type text NOT NULL,
    applies_to_catalog text,
    applies_to_types text[] DEFAULT '{}'::text[] NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    system_key text,
    prompt_on_form boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attribute_definitions_applies_to_catalog_check CHECK ((applies_to_catalog = ANY (ARRAY['reagent'::text, 'supply'::text, 'equipment'::text]))),
    CONSTRAINT attribute_definitions_value_type_check CHECK ((value_type = ANY (ARRAY['select'::text, 'multi_select'::text, 'text'::text, 'number'::text])))
);

CREATE TABLE attribute_options (
    id text NOT NULL,
    definition_id text NOT NULL,
    value text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE audit_log (
    id text NOT NULL,
    user_id text,
    username text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    lab_id text,
    details jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text
);

CREATE TABLE audit_log_archive (
    id text NOT NULL,
    user_id text,
    username text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    lab_id text,
    details jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    archived_at timestamp with time zone NOT NULL
);

CREATE TABLE custom_units (
    id text NOT NULL,
    lab_id text NOT NULL,
    label text NOT NULL,
    kind text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_units_kind_check CHECK ((kind = ANY (ARRAY['mass'::text, 'volume'::text, 'molarity'::text, 'mass-conc'::text, 'count-conc'::text, 'percent'::text, 'activity'::text, 'activity-conc'::text, 'fold'::text, 'cell-conc'::text, 'count'::text])))
);

CREATE TABLE donor_collection_history (
    id text NOT NULL,
    donor_id text NOT NULL,
    collection_date date,
    specimen_type text,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE donors (
    id text NOT NULL,
    lab_id text NOT NULL,
    donor_source_id text,
    donor_internal_id text,
    species text,
    age text,
    sex text,
    ethnicity text,
    clinical_status text,
    diagnosis text,
    disease_stage text,
    notes text,
    is_curated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT donors_has_at_least_one_id CHECK (((donor_source_id IS NOT NULL) OR (donor_internal_id IS NOT NULL)))
);

CREATE TABLE equipment_attribute_values (
    id text NOT NULL,
    item_id text NOT NULL,
    definition_id text NOT NULL,
    value_option_id text,
    value_text text,
    value_number numeric
);

CREATE TABLE equipment_categories (
    id text NOT NULL,
    lab_id text NOT NULL,
    name text NOT NULL,
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE equipment_documents (
    id text NOT NULL,
    item_id text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    doc_type text,
    CONSTRAINT equipment_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['sds'::text, 'spec_sheet'::text, 'coa'::text, 'protocol'::text, 'other'::text])))
);

CREATE TABLE equipment_items (
    id text NOT NULL,
    lab_id text NOT NULL,
    category_id text NOT NULL,
    name text NOT NULL,
    serial_number text,
    manufacturer text,
    model text,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    condition_notes text,
    purchase_date date,
    warranty_expiration date,
    purchase_cost numeric,
    asset_tag text,
    next_maintenance_date date,
    decommission_date date,
    decommission_reason text,
    disposal_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vendor_name text,
    vendor_catalog_number text,
    location_id text,
    is_seeded boolean DEFAULT false NOT NULL
);

CREATE TABLE equipment_maintenance_log (
    id text NOT NULL,
    item_id text NOT NULL,
    date_performed date NOT NULL,
    maintenance_type text NOT NULL,
    performed_by text,
    technician text,
    description text,
    next_scheduled_date date,
    cost numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE invite_codes (
    id text NOT NULL,
    lab_id text NOT NULL,
    code text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_by text NOT NULL,
    max_uses integer DEFAULT 1,
    use_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    create_researcher boolean DEFAULT true NOT NULL,
    deactivation_reason text,
    CONSTRAINT invite_codes_deactivation_reason_check CHECK ((deactivation_reason = ANY (ARRAY['used'::text, 'expired'::text, 'manual'::text]))),
    CONSTRAINT invite_codes_role_check CHECK ((role = ANY (ARRAY['lab_admin'::text, 'user'::text])))
);

CREATE TABLE labs (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_demo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    demo_limits jsonb
);

CREATE TABLE locations (
    id text NOT NULL,
    lab_id text NOT NULL,
    name text NOT NULL,
    description text,
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE lookup_values (
    id text NOT NULL,
    category text NOT NULL,
    lab_id text NOT NULL,
    value text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lookup_values_category_check CHECK ((category = ANY (ARRAY['species'::text, 'source'::text, 'media'::text, 'specimen_type'::text, 'equipment_maintenance_type'::text, 'reagent_type'::text, 'vendor'::text, 'manufacturer'::text])))
);

CREATE TABLE persons (
    id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    "position" text,
    department text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE reagent_attribute_values (
    id text NOT NULL,
    item_id text NOT NULL,
    definition_id text NOT NULL,
    value_option_id text,
    value_text text,
    value_number numeric
);

CREATE TABLE reagent_barcodes (
    id text NOT NULL,
    item_id text NOT NULL,
    lot_id text,
    barcode_value text NOT NULL,
    barcode_type text DEFAULT 'internal'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    label text,
    CONSTRAINT reagent_barcodes_barcode_type_check CHECK ((barcode_type = ANY (ARRAY['internal'::text, 'manufacturer_sku'::text, 'upc'::text])))
);

CREATE TABLE reagent_categories (
    id text NOT NULL,
    lab_id text NOT NULL,
    name text NOT NULL,
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE reagent_documents (
    id text NOT NULL,
    item_id text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    notes text,
    doc_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reagent_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['sds'::text, 'spec_sheet'::text, 'coa'::text, 'protocol'::text, 'other'::text])))
);

CREATE TABLE reagent_items (
    id text NOT NULL,
    lab_id text NOT NULL,
    category_id text NOT NULL,
    name text NOT NULL,
    manufacturer text,
    catalog_number text,
    vendor_name text,
    vendor_catalog_number text,
    stock_unit text,
    reagent_type text,
    cas_number text,
    concentration numeric,
    concentration_unit text,
    expiry_warning_days integer,
    reorder_threshold numeric,
    reorder_threshold_unit text,
    reorder_quantity numeric,
    reorder_unit text,
    unit_price numeric,
    description text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT reagent_items_status_check CHECK ((status = ANY (ARRAY['active'::text, 'discontinued'::text, 'archived'::text])))
);

CREATE TABLE reagent_lots (
    id text NOT NULL,
    item_id text NOT NULL,
    location_id text NOT NULL,
    lot_number text,
    quantity numeric DEFAULT 0 NOT NULL,
    expiration_date date,
    opened_date date,
    received_date date,
    concentration numeric,
    concentration_unit text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reagent_lots_status_check CHECK ((status = ANY (ARRAY['active'::text, 'depleted'::text, 'disposed'::text])))
);

CREATE TABLE reagent_packaging_levels (
    id text NOT NULL,
    item_id text NOT NULL,
    unit_name text NOT NULL,
    quantity numeric NOT NULL,
    parent_unit text
);

CREATE TABLE reagent_transactions (
    id text NOT NULL,
    item_id text NOT NULL,
    lot_id text,
    location_id text NOT NULL,
    lab_id text NOT NULL,
    type text NOT NULL,
    quantity_change numeric NOT NULL,
    quantity_after numeric NOT NULL,
    po_number text,
    cost numeric,
    performed_by text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    voided_by text,
    void_reason text,
    related_transaction_id text,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT reagent_transactions_type_check CHECK ((type = ANY (ARRAY['received'::text, 'issued'::text, 'count_adjustment'::text, 'disposed'::text, 'void_reversal'::text])))
);

CREATE TABLE refresh_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone,
    is_revoked boolean DEFAULT false NOT NULL,
    user_agent text,
    ip_address text
);

CREATE TABLE researchers (
    id text NOT NULL,
    person_id text NOT NULL,
    lab_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    source text DEFAULT 'admin'::text NOT NULL,
    CONSTRAINT researchers_source_check CHECK ((source = ANY (ARRAY['registration'::text, 'admin'::text])))
);

CREATE TABLE schema_migrations (
    id integer NOT NULL,
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE security_config (
    id integer NOT NULL,
    use_enhanced_auth boolean DEFAULT false NOT NULL,
    require_strong_passwords boolean DEFAULT false NOT NULL,
    password_min_length integer DEFAULT 8 NOT NULL,
    password_require_special_chars boolean DEFAULT false NOT NULL,
    access_token_expiry_minutes integer DEFAULT 15 NOT NULL,
    session_timeout_minutes integer DEFAULT 480 NOT NULL,
    idle_warning_minutes integer DEFAULT 5 NOT NULL,
    absolute_session_timeout_hours integer DEFAULT 168 NOT NULL,
    max_concurrent_sessions integer DEFAULT 3 NOT NULL,
    enable_rate_limiting boolean DEFAULT true NOT NULL,
    login_attempts_per_minute integer DEFAULT 10 NOT NULL,
    lockout_duration_minutes integer DEFAULT 15 NOT NULL,
    enable_admin_controls boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT security_config_id_check CHECK ((id = 1))
);

CREATE TABLE storage_current (
    id integer NOT NULL,
    lab_id text NOT NULL,
    version integer NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    config_json jsonb NOT NULL
);

ALTER TABLE storage_current ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME storage_current_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE storage_snapshots (
    id text NOT NULL,
    lab_id text NOT NULL,
    version integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    description text,
    created_by text,
    size_bytes integer NOT NULL,
    config_json jsonb NOT NULL
);

CREATE TABLE storage_versions (
    version integer NOT NULL,
    lab_id text NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    change_description text,
    changed_by text,
    config_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE storage_versions_version_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE storage_versions_version_seq OWNED BY storage_versions.version;

CREATE TABLE supply_attribute_values (
    id text NOT NULL,
    item_id text NOT NULL,
    definition_id text NOT NULL,
    value_option_id text,
    value_text text,
    value_number numeric
);

CREATE TABLE supply_barcodes (
    id text NOT NULL,
    item_id text NOT NULL,
    barcode_value text NOT NULL,
    barcode_type text DEFAULT 'internal'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    label text,
    CONSTRAINT supply_barcodes_barcode_type_check CHECK ((barcode_type = ANY (ARRAY['internal'::text, 'manufacturer_sku'::text, 'upc'::text])))
);

CREATE TABLE supply_categories (
    id text NOT NULL,
    lab_id text NOT NULL,
    name text NOT NULL,
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE supply_documents (
    id text NOT NULL,
    item_id text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    doc_type text,
    CONSTRAINT supply_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['sds'::text, 'spec_sheet'::text, 'coa'::text, 'protocol'::text, 'other'::text])))
);

CREATE TABLE supply_items (
    id text NOT NULL,
    lab_id text NOT NULL,
    category_id text NOT NULL,
    name text NOT NULL,
    manufacturer text,
    catalog_number text,
    vendor_name text,
    vendor_catalog_number text,
    stock_unit text,
    base_item_name text,
    reorder_threshold numeric,
    reorder_threshold_unit text,
    reorder_quantity numeric,
    reorder_unit text,
    unit_price numeric,
    current_lot_number text,
    description text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT supply_items_status_check CHECK ((status = ANY (ARRAY['active'::text, 'discontinued'::text, 'archived'::text])))
);

CREATE TABLE supply_packaging_levels (
    id text NOT NULL,
    item_id text NOT NULL,
    unit_name text NOT NULL,
    quantity numeric NOT NULL,
    parent_unit text
);

CREATE TABLE supply_stock (
    id text NOT NULL,
    item_id text NOT NULL,
    location_id text NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE supply_transactions (
    id text NOT NULL,
    item_id text NOT NULL,
    location_id text NOT NULL,
    lab_id text NOT NULL,
    type text NOT NULL,
    quantity_change numeric NOT NULL,
    quantity_after numeric NOT NULL,
    lot_number text,
    expiration_date date,
    po_number text,
    cost numeric,
    performed_by text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    voided_by text,
    void_reason text,
    related_transaction_id text,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT supply_transactions_type_check CHECK ((type = ANY (ARRAY['received'::text, 'issued'::text, 'count_adjustment'::text, 'disposed'::text, 'void_reversal'::text])))
);

CREATE TABLE tubes (
    id text NOT NULL,
    lab_id text NOT NULL,
    tank_id text NOT NULL,
    rack_id text NOT NULL,
    box_id text NOT NULL,
    "position" integer NOT NULL,
    cell_type text,
    donor_internal_id text,
    donor_source_id text,
    concentration text,
    concentration_unit text,
    date text,
    researcher_id text,
    created_by_name text,
    media_type text,
    media_supplements text,
    media_selection text,
    culture_condition text,
    lot_number text,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_locked boolean DEFAULT false,
    locked_by text,
    lock_note text,
    locked_at timestamp with time zone,
    shared_with_user_ids text,
    species text,
    source text,
    catalog_number text,
    passage_number integer,
    search_vector tsvector,
    is_seeded boolean DEFAULT false NOT NULL,
    CONSTRAINT tubes_concentration_unit_check CHECK ((concentration_unit = ANY (ARRAY['c/v'::text, 'c/mL'::text]))),
    CONSTRAINT tubes_passage_number_check CHECK (((passage_number >= 0) AND (passage_number <= 999)))
);

CREATE TABLE user_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    refresh_token text NOT NULL,
    device_info text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

CREATE TABLE users (
    id text NOT NULL,
    username text NOT NULL,
    api_key text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    password_hash text,
    salt text,
    created_at timestamp with time zone NOT NULL,
    researcher_id text,
    person_id text,
    lab_id text,
    status text DEFAULT 'approved'::text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token text,
    email_verification_expiry timestamp with time zone,
    last_verification_email_sent timestamp with time zone,
    password_reset_token text,
    password_reset_expiry timestamp with time zone,
    require_password_change boolean DEFAULT false NOT NULL,
    last_password_change timestamp with time zone,
    settings jsonb DEFAULT '{}'::jsonb,
    lab_is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['system_admin'::text, 'lab_admin'::text, 'user'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'deactivated'::text, 'suspended'::text])))
);

ALTER TABLE ONLY storage_versions ALTER COLUMN version SET DEFAULT nextval('storage_versions_version_seq'::regclass);

ALTER TABLE ONLY attribute_definitions
    ADD CONSTRAINT attribute_definitions_lab_id_name_key UNIQUE (lab_id, name);

ALTER TABLE ONLY attribute_definitions
    ADD CONSTRAINT attribute_definitions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY attribute_options
    ADD CONSTRAINT attribute_options_definition_id_value_key UNIQUE (definition_id, value);

ALTER TABLE ONLY attribute_options
    ADD CONSTRAINT attribute_options_pkey PRIMARY KEY (id);

ALTER TABLE ONLY audit_log_archive
    ADD CONSTRAINT audit_log_archive_pkey PRIMARY KEY (id);

ALTER TABLE ONLY audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY custom_units
    ADD CONSTRAINT custom_units_lab_id_label_key UNIQUE (lab_id, label);

ALTER TABLE ONLY custom_units
    ADD CONSTRAINT custom_units_pkey PRIMARY KEY (id);

ALTER TABLE ONLY donor_collection_history
    ADD CONSTRAINT donor_collection_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY donors
    ADD CONSTRAINT donors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY equipment_attribute_values
    ADD CONSTRAINT equipment_attribute_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY equipment_categories
    ADD CONSTRAINT equipment_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY equipment_documents
    ADD CONSTRAINT equipment_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY equipment_items
    ADD CONSTRAINT equipment_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY equipment_maintenance_log
    ADD CONSTRAINT equipment_maintenance_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY invite_codes
    ADD CONSTRAINT invite_codes_code_key UNIQUE (code);

ALTER TABLE ONLY invite_codes
    ADD CONSTRAINT invite_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY labs
    ADD CONSTRAINT labs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY labs
    ADD CONSTRAINT labs_slug_key UNIQUE (slug);

ALTER TABLE ONLY locations
    ADD CONSTRAINT locations_lab_id_name_key UNIQUE (lab_id, name);

ALTER TABLE ONLY locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY lookup_values
    ADD CONSTRAINT lookup_values_lab_id_category_value_key UNIQUE (lab_id, category, value);

ALTER TABLE ONLY lookup_values
    ADD CONSTRAINT lookup_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY persons
    ADD CONSTRAINT persons_email_key UNIQUE (email);

ALTER TABLE ONLY persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_attribute_values
    ADD CONSTRAINT reagent_attribute_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_barcodes
    ADD CONSTRAINT reagent_barcodes_barcode_value_key UNIQUE (barcode_value);

ALTER TABLE ONLY reagent_barcodes
    ADD CONSTRAINT reagent_barcodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_categories
    ADD CONSTRAINT reagent_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_documents
    ADD CONSTRAINT reagent_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_items
    ADD CONSTRAINT reagent_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_lots
    ADD CONSTRAINT reagent_lots_item_id_location_id_lot_number_key UNIQUE (item_id, location_id, lot_number);

ALTER TABLE ONLY reagent_lots
    ADD CONSTRAINT reagent_lots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_packaging_levels
    ADD CONSTRAINT reagent_packaging_levels_item_id_unit_name_key UNIQUE (item_id, unit_name);

ALTER TABLE ONLY reagent_packaging_levels
    ADD CONSTRAINT reagent_packaging_levels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);

ALTER TABLE ONLY researchers
    ADD CONSTRAINT researchers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY security_config
    ADD CONSTRAINT security_config_pkey PRIMARY KEY (id);

ALTER TABLE ONLY storage_current
    ADD CONSTRAINT storage_current_lab_id_key UNIQUE (lab_id);

ALTER TABLE ONLY storage_current
    ADD CONSTRAINT storage_current_pkey PRIMARY KEY (id);

ALTER TABLE ONLY storage_snapshots
    ADD CONSTRAINT storage_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY storage_versions
    ADD CONSTRAINT storage_versions_pkey PRIMARY KEY (version);

ALTER TABLE ONLY supply_attribute_values
    ADD CONSTRAINT supply_attribute_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_barcodes
    ADD CONSTRAINT supply_barcodes_barcode_value_key UNIQUE (barcode_value);

ALTER TABLE ONLY supply_barcodes
    ADD CONSTRAINT supply_barcodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_categories
    ADD CONSTRAINT supply_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_documents
    ADD CONSTRAINT supply_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_items
    ADD CONSTRAINT supply_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_packaging_levels
    ADD CONSTRAINT supply_packaging_levels_item_id_unit_name_key UNIQUE (item_id, unit_name);

ALTER TABLE ONLY supply_packaging_levels
    ADD CONSTRAINT supply_packaging_levels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_stock
    ADD CONSTRAINT supply_stock_item_id_location_id_key UNIQUE (item_id, location_id);

ALTER TABLE ONLY supply_stock
    ADD CONSTRAINT supply_stock_pkey PRIMARY KEY (id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tubes
    ADD CONSTRAINT tubes_lab_location_unique UNIQUE (lab_id, tank_id, rack_id, box_id, "position");

ALTER TABLE ONLY tubes
    ADD CONSTRAINT tubes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_key UNIQUE (refresh_token);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_api_key_key UNIQUE (api_key);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_attribute_definitions_lab ON attribute_definitions USING btree (lab_id);

CREATE INDEX idx_attribute_options_definition ON attribute_options USING btree (definition_id);

CREATE INDEX idx_audit_archive_archived_at ON audit_log_archive USING btree (archived_at DESC);

CREATE INDEX idx_audit_archive_timestamp ON audit_log_archive USING btree ("timestamp" DESC);

CREATE INDEX idx_audit_archive_user_id ON audit_log_archive USING btree (user_id);

CREATE INDEX idx_audit_log_action ON audit_log USING btree (action);

CREATE INDEX idx_audit_log_composite ON audit_log USING btree (entity_type, entity_id, "timestamp" DESC);

CREATE INDEX idx_audit_log_entity_id ON audit_log USING btree (entity_id);

CREATE INDEX idx_audit_log_entity_type ON audit_log USING btree (entity_type);

CREATE INDEX idx_audit_log_lab_id ON audit_log USING btree (lab_id);

CREATE INDEX idx_audit_log_timestamp ON audit_log USING btree ("timestamp" DESC);

CREATE INDEX idx_audit_log_user_id ON audit_log USING btree (user_id);

CREATE INDEX idx_custom_units_lab ON custom_units USING btree (lab_id);

CREATE INDEX idx_donor_collection_history_donor_id ON donor_collection_history USING btree (donor_id);

CREATE INDEX idx_donors_internal_id ON donors USING btree (lab_id, donor_internal_id) WHERE (donor_internal_id IS NOT NULL);

CREATE INDEX idx_donors_internal_id_trgm ON donors USING gin (donor_internal_id gin_trgm_ops) WHERE (donor_internal_id IS NOT NULL);

CREATE INDEX idx_donors_lab_id ON donors USING btree (lab_id);

CREATE INDEX idx_donors_source_id ON donors USING btree (lab_id, donor_source_id) WHERE (donor_source_id IS NOT NULL);

CREATE INDEX idx_donors_source_id_trgm ON donors USING gin (donor_source_id gin_trgm_ops) WHERE (donor_source_id IS NOT NULL);

CREATE INDEX idx_donors_uncurated ON donors USING btree (lab_id, is_curated) WHERE (is_curated = false);

CREATE INDEX idx_equipment_attribute_values_definition ON equipment_attribute_values USING btree (definition_id);

CREATE INDEX idx_equipment_attribute_values_item ON equipment_attribute_values USING btree (item_id);

CREATE INDEX idx_equipment_attribute_values_option ON equipment_attribute_values USING btree (value_option_id) WHERE (value_option_id IS NOT NULL);

CREATE INDEX idx_equipment_categories_lab_id ON equipment_categories USING btree (lab_id);

CREATE INDEX idx_equipment_documents_item ON equipment_documents USING btree (item_id);

CREATE INDEX idx_equipment_items_category ON equipment_items USING btree (category_id);

CREATE INDEX idx_equipment_items_lab_id ON equipment_items USING btree (lab_id);

CREATE INDEX idx_equipment_items_lab_status ON equipment_items USING btree (lab_id, status);

CREATE INDEX idx_equipment_maintenance_item ON equipment_maintenance_log USING btree (item_id);

CREATE INDEX idx_invite_codes_code ON invite_codes USING btree (code);

CREATE INDEX idx_invite_codes_lab_id ON invite_codes USING btree (lab_id);

CREATE INDEX idx_labs_is_active ON labs USING btree (is_active);

CREATE INDEX idx_labs_slug ON labs USING btree (slug);

CREATE INDEX idx_locations_lab_id ON locations USING btree (lab_id);

CREATE INDEX idx_locations_parent ON locations USING btree (parent_id);

CREATE INDEX idx_lookup_values_category ON lookup_values USING btree (category);

CREATE INDEX idx_lookup_values_category_active ON lookup_values USING btree (category, is_active);

CREATE INDEX idx_lookup_values_lab_id ON lookup_values USING btree (lab_id);

CREATE INDEX idx_persons_email ON persons USING btree (lower(email));

CREATE INDEX idx_persons_first_name ON persons USING btree (first_name);

CREATE INDEX idx_persons_last_name ON persons USING btree (last_name);

CREATE INDEX idx_reagent_attribute_values_definition ON reagent_attribute_values USING btree (definition_id);

CREATE INDEX idx_reagent_attribute_values_item ON reagent_attribute_values USING btree (item_id);

CREATE INDEX idx_reagent_attribute_values_option ON reagent_attribute_values USING btree (value_option_id) WHERE (value_option_id IS NOT NULL);

CREATE INDEX idx_reagent_barcodes_item ON reagent_barcodes USING btree (item_id);

CREATE INDEX idx_reagent_barcodes_lot ON reagent_barcodes USING btree (lot_id) WHERE (lot_id IS NOT NULL);

CREATE INDEX idx_reagent_categories_lab_id ON reagent_categories USING btree (lab_id);

CREATE INDEX idx_reagent_documents_item ON reagent_documents USING btree (item_id);

CREATE INDEX idx_reagent_items_category ON reagent_items USING btree (category_id);

CREATE INDEX idx_reagent_items_lab_id ON reagent_items USING btree (lab_id);

CREATE INDEX idx_reagent_items_lab_status ON reagent_items USING btree (lab_id, status);

CREATE INDEX idx_reagent_lots_expiration ON reagent_lots USING btree (expiration_date) WHERE (expiration_date IS NOT NULL);

CREATE INDEX idx_reagent_lots_item ON reagent_lots USING btree (item_id);

CREATE INDEX idx_reagent_lots_location ON reagent_lots USING btree (location_id);

CREATE INDEX idx_reagent_packaging_levels_item ON reagent_packaging_levels USING btree (item_id);

CREATE INDEX idx_reagent_transactions_item ON reagent_transactions USING btree (item_id);

CREATE INDEX idx_reagent_transactions_lab ON reagent_transactions USING btree (lab_id);

CREATE INDEX idx_reagent_transactions_lot ON reagent_transactions USING btree (lot_id) WHERE (lot_id IS NOT NULL);

CREATE INDEX idx_reagent_transactions_related ON reagent_transactions USING btree (related_transaction_id) WHERE (related_transaction_id IS NOT NULL);

CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens USING btree (created_at DESC);

CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens USING btree (expires_at);

CREATE INDEX idx_refresh_tokens_ip_address ON refresh_tokens USING btree (ip_address);

CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens USING btree (is_revoked);

CREATE INDEX idx_refresh_tokens_last_used ON refresh_tokens USING btree (last_used_at DESC);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens USING btree (user_id);

CREATE INDEX idx_researchers_active ON researchers USING btree (active);

CREATE INDEX idx_researchers_lab_id ON researchers USING btree (lab_id);

CREATE INDEX idx_researchers_person_id ON researchers USING btree (person_id);

CREATE INDEX idx_storage_snapshots_created_at ON storage_snapshots USING btree (created_at DESC);

CREATE INDEX idx_storage_snapshots_version ON storage_snapshots USING btree (version);

CREATE INDEX idx_storage_versions_updated_at ON storage_versions USING btree (updated_at DESC);

CREATE INDEX idx_supply_attribute_values_definition ON supply_attribute_values USING btree (definition_id);

CREATE INDEX idx_supply_attribute_values_item ON supply_attribute_values USING btree (item_id);

CREATE INDEX idx_supply_attribute_values_option ON supply_attribute_values USING btree (value_option_id) WHERE (value_option_id IS NOT NULL);

CREATE INDEX idx_supply_barcodes_item ON supply_barcodes USING btree (item_id);

CREATE INDEX idx_supply_categories_lab_id ON supply_categories USING btree (lab_id);

CREATE INDEX idx_supply_documents_item ON supply_documents USING btree (item_id);

CREATE INDEX idx_supply_items_category ON supply_items USING btree (category_id);

CREATE INDEX idx_supply_items_lab_id ON supply_items USING btree (lab_id);

CREATE INDEX idx_supply_items_lab_status ON supply_items USING btree (lab_id, status);

CREATE INDEX idx_supply_packaging_levels_item ON supply_packaging_levels USING btree (item_id);

CREATE INDEX idx_supply_stock_item ON supply_stock USING btree (item_id);

CREATE INDEX idx_supply_transactions_item ON supply_transactions USING btree (item_id);

CREATE INDEX idx_supply_transactions_lab ON supply_transactions USING btree (lab_id);

CREATE INDEX idx_supply_transactions_related ON supply_transactions USING btree (related_transaction_id) WHERE (related_transaction_id IS NOT NULL);

CREATE INDEX idx_tubes_cell_type ON tubes USING btree (cell_type);

CREATE INDEX idx_tubes_cell_type_trgm ON tubes USING gin (cell_type gin_trgm_ops);

CREATE INDEX idx_tubes_created_at ON tubes USING btree (created_at DESC);

CREATE INDEX idx_tubes_created_by_name ON tubes USING btree (created_by_name);

CREATE INDEX idx_tubes_culture_condition ON tubes USING btree (culture_condition);

CREATE INDEX idx_tubes_date ON tubes USING btree (date);

CREATE INDEX idx_tubes_donor_internal ON tubes USING btree (donor_internal_id);

CREATE INDEX idx_tubes_donor_internal_trgm ON tubes USING gin (donor_internal_id gin_trgm_ops);

CREATE INDEX idx_tubes_donor_source ON tubes USING btree (donor_source_id);

CREATE INDEX idx_tubes_donor_source_trgm ON tubes USING gin (donor_source_id gin_trgm_ops);

CREATE INDEX idx_tubes_is_locked ON tubes USING btree (is_locked);

CREATE INDEX idx_tubes_lab_id ON tubes USING btree (lab_id);

CREATE INDEX idx_tubes_lab_location ON tubes USING btree (lab_id, tank_id, rack_id, box_id);

CREATE INDEX idx_tubes_location ON tubes USING btree (tank_id, rack_id, box_id);

CREATE INDEX idx_tubes_locked_by ON tubes USING btree (locked_by);

CREATE INDEX idx_tubes_lot_number ON tubes USING btree (lot_number);

CREATE INDEX idx_tubes_lot_number_trgm ON tubes USING gin (lot_number gin_trgm_ops);

CREATE INDEX idx_tubes_notes_trgm ON tubes USING gin (notes gin_trgm_ops);

CREATE INDEX idx_tubes_position ON tubes USING btree (rack_id, box_id, "position");

CREATE INDEX idx_tubes_researcher_id ON tubes USING btree (researcher_id);

CREATE INDEX idx_tubes_search_vector ON tubes USING gin (search_vector);

CREATE INDEX idx_tubes_source ON tubes USING btree (source);

CREATE INDEX idx_tubes_species ON tubes USING btree (species);

CREATE INDEX idx_tubes_updated_at ON tubes USING btree (updated_at DESC);

CREATE INDEX idx_user_sessions_expires_at ON user_sessions USING btree (expires_at);

CREATE INDEX idx_user_sessions_is_active ON user_sessions USING btree (is_active);

CREATE INDEX idx_user_sessions_last_used ON user_sessions USING btree (last_used_at DESC);

CREATE INDEX idx_user_sessions_refresh_token ON user_sessions USING btree (refresh_token);

CREATE INDEX idx_user_sessions_user_id ON user_sessions USING btree (user_id);

CREATE INDEX idx_users_api_key ON users USING btree (api_key);

CREATE INDEX idx_users_email_verification_token ON users USING btree (email_verification_token);

CREATE INDEX idx_users_lab_id ON users USING btree (lab_id);

CREATE INDEX idx_users_password_reset_token ON users USING btree (password_reset_token);

CREATE INDEX idx_users_person_id ON users USING btree (person_id);

CREATE INDEX idx_users_researcher_id ON users USING btree (researcher_id);

CREATE INDEX idx_users_role ON users USING btree (role);

CREATE INDEX idx_users_status ON users USING btree (status);

CREATE UNIQUE INDEX uq_attribute_definitions_system_key ON attribute_definitions USING btree (lab_id, system_key) WHERE (system_key IS NOT NULL);

CREATE UNIQUE INDEX uq_equipment_categories_sub ON equipment_categories USING btree (lab_id, parent_id, name) WHERE (parent_id IS NOT NULL);

CREATE UNIQUE INDEX uq_equipment_categories_top ON equipment_categories USING btree (lab_id, name) WHERE (parent_id IS NULL);

CREATE UNIQUE INDEX uq_equipment_items_asset_tag ON equipment_items USING btree (lab_id, asset_tag) WHERE (asset_tag IS NOT NULL);

CREATE UNIQUE INDEX uq_reagent_categories_sub ON reagent_categories USING btree (lab_id, parent_id, name) WHERE (parent_id IS NOT NULL);

CREATE UNIQUE INDEX uq_reagent_categories_top ON reagent_categories USING btree (lab_id, name) WHERE (parent_id IS NULL);

CREATE UNIQUE INDEX uq_supply_categories_sub ON supply_categories USING btree (lab_id, parent_id, name) WHERE (parent_id IS NOT NULL);

CREATE UNIQUE INDEX uq_supply_categories_top ON supply_categories USING btree (lab_id, name) WHERE (parent_id IS NULL);

CREATE UNIQUE INDEX users_username_active_lab_key ON users USING btree (username) WHERE lab_is_active;

CREATE TRIGGER tubes_search_vector_trigger BEFORE INSERT OR UPDATE ON tubes FOR EACH ROW EXECUTE FUNCTION tubes_search_vector_update();

ALTER TABLE ONLY attribute_definitions
    ADD CONSTRAINT attribute_definitions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY attribute_options
    ADD CONSTRAINT attribute_options_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE;

ALTER TABLE ONLY audit_log_archive
    ADD CONSTRAINT audit_log_archive_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY custom_units
    ADD CONSTRAINT custom_units_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY donor_collection_history
    ADD CONSTRAINT donor_collection_history_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE;

ALTER TABLE ONLY donors
    ADD CONSTRAINT donors_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY equipment_attribute_values
    ADD CONSTRAINT equipment_attribute_values_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE;

ALTER TABLE ONLY equipment_attribute_values
    ADD CONSTRAINT equipment_attribute_values_item_id_fkey FOREIGN KEY (item_id) REFERENCES equipment_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY equipment_attribute_values
    ADD CONSTRAINT equipment_attribute_values_value_option_id_fkey FOREIGN KEY (value_option_id) REFERENCES attribute_options(id) ON DELETE CASCADE;

ALTER TABLE ONLY equipment_categories
    ADD CONSTRAINT equipment_categories_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY equipment_categories
    ADD CONSTRAINT equipment_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES equipment_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY equipment_documents
    ADD CONSTRAINT equipment_documents_item_id_fkey FOREIGN KEY (item_id) REFERENCES equipment_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY equipment_items
    ADD CONSTRAINT equipment_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY equipment_items
    ADD CONSTRAINT equipment_items_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY equipment_items
    ADD CONSTRAINT equipment_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY equipment_maintenance_log
    ADD CONSTRAINT equipment_maintenance_log_item_id_fkey FOREIGN KEY (item_id) REFERENCES equipment_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY invite_codes
    ADD CONSTRAINT invite_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE ONLY invite_codes
    ADD CONSTRAINT invite_codes_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY locations
    ADD CONSTRAINT locations_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY locations
    ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY lookup_values
    ADD CONSTRAINT lookup_values_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY reagent_attribute_values
    ADD CONSTRAINT reagent_attribute_values_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_attribute_values
    ADD CONSTRAINT reagent_attribute_values_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_attribute_values
    ADD CONSTRAINT reagent_attribute_values_value_option_id_fkey FOREIGN KEY (value_option_id) REFERENCES attribute_options(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_barcodes
    ADD CONSTRAINT reagent_barcodes_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_barcodes
    ADD CONSTRAINT reagent_barcodes_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES reagent_lots(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_categories
    ADD CONSTRAINT reagent_categories_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY reagent_categories
    ADD CONSTRAINT reagent_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES reagent_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY reagent_documents
    ADD CONSTRAINT reagent_documents_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_items
    ADD CONSTRAINT reagent_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES reagent_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY reagent_items
    ADD CONSTRAINT reagent_items_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY reagent_lots
    ADD CONSTRAINT reagent_lots_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_lots
    ADD CONSTRAINT reagent_lots_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY reagent_packaging_levels
    ADD CONSTRAINT reagent_packaging_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES reagent_items(id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES reagent_lots(id) ON DELETE SET NULL;

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_related_transaction_id_fkey FOREIGN KEY (related_transaction_id) REFERENCES reagent_transactions(id);

ALTER TABLE ONLY reagent_transactions
    ADD CONSTRAINT reagent_transactions_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE ONLY refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY researchers
    ADD CONSTRAINT researchers_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY researchers
    ADD CONSTRAINT researchers_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id);

ALTER TABLE ONLY storage_current
    ADD CONSTRAINT storage_current_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY storage_current
    ADD CONSTRAINT storage_current_version_fkey FOREIGN KEY (version) REFERENCES storage_versions(version);

ALTER TABLE ONLY storage_snapshots
    ADD CONSTRAINT storage_snapshots_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY storage_snapshots
    ADD CONSTRAINT storage_snapshots_version_fkey FOREIGN KEY (version) REFERENCES storage_versions(version);

ALTER TABLE ONLY storage_versions
    ADD CONSTRAINT storage_versions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY supply_attribute_values
    ADD CONSTRAINT supply_attribute_values_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES attribute_definitions(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_attribute_values
    ADD CONSTRAINT supply_attribute_values_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_attribute_values
    ADD CONSTRAINT supply_attribute_values_value_option_id_fkey FOREIGN KEY (value_option_id) REFERENCES attribute_options(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_barcodes
    ADD CONSTRAINT supply_barcodes_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_categories
    ADD CONSTRAINT supply_categories_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY supply_categories
    ADD CONSTRAINT supply_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES supply_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY supply_documents
    ADD CONSTRAINT supply_documents_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_items
    ADD CONSTRAINT supply_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES supply_categories(id) ON DELETE RESTRICT;

ALTER TABLE ONLY supply_items
    ADD CONSTRAINT supply_items_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY supply_packaging_levels
    ADD CONSTRAINT supply_packaging_levels_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_stock
    ADD CONSTRAINT supply_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY supply_stock
    ADD CONSTRAINT supply_stock_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES supply_items(id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_related_transaction_id_fkey FOREIGN KEY (related_transaction_id) REFERENCES supply_transactions(id);

ALTER TABLE ONLY supply_transactions
    ADD CONSTRAINT supply_transactions_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE ONLY tubes
    ADD CONSTRAINT tubes_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY tubes
    ADD CONSTRAINT tubes_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES users(id);

ALTER TABLE ONLY tubes
    ADD CONSTRAINT tubes_researcher_id_fkey FOREIGN KEY (researcher_id) REFERENCES researchers(id);

ALTER TABLE ONLY user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY users
    ADD CONSTRAINT users_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES labs(id);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(id);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_researcher_id_fkey FOREIGN KEY (researcher_id) REFERENCES researchers(id) ON DELETE CASCADE;
