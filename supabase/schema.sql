create table if not exists business_sheet_meta (
  sheet_key text primary key,
  version bigint not null default 1,
  migrated_from_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  sector text;
begin
  foreach sector in array array[
    'projects',
    'leads',
    'revenue',
    'team',
    'content',
    'services',
    'shopping',
    'timetable',
    'servers',
    'databases'
  ]
  loop
    execute format(
      'create table if not exists business_%I_columns (
        sheet_id text not null,
        column_id text not null,
        label text not null,
        type text not null,
        options_text text,
        width text,
        position integer not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (sheet_id, column_id)
      )',
      sector
    );

    execute format(
      'create table if not exists business_%I_rows (
        sheet_id text not null,
        row_id text not null,
        position integer not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (sheet_id, row_id)
      )',
      sector
    );

    execute format(
      'create table if not exists business_%I_cells (
        sheet_id text not null,
        row_id text not null,
        column_id text not null,
        value_text text,
        value_number double precision,
        value_boolean boolean,
        value_kind text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (sheet_id, row_id, column_id)
      )',
      sector
    );
  end loop;
end $$;

-- Runtime migration still reads legacy `business_state` if it exists,
-- then moves the old data into these normalized sector tables.
