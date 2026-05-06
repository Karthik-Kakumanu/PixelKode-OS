create table if not exists business_state (
  id text primary key,
  sheets jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into business_state (id, sheets)
values (
  'pixelkode-main',
  '{"projects":{"columns":[],"rows":[]},"leads":{"columns":[],"rows":[]},"revenue":{"columns":[],"rows":[]},"team":{"columns":[],"rows":[]},"content":{"columns":[],"rows":[]}}'::jsonb
)
on conflict (id) do nothing;
