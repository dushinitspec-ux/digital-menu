-- Один контур (RU или EU) = одна база. Данные контуров никогда не смешиваются.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null check (region in ('ru', 'eu')),
  country text not null,
  business_type text not null,
  currency text not null check (currency in ('RUB', 'EUR')),
  locale text not null check (locale in ('ru', 'en')),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  locale text not null default 'ru',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table memberships (
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on memberships (user_id);

-- id — SHA-256 токена из cookie; сам токен в базе не хранится.
create table sessions (
  id text primary key,
  user_id uuid not null references users (id) on delete cascade,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

create table locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  address text not null default '',
  timezone text not null,
  created_at timestamptz not null default now()
);
create index locations_org_idx on locations (org_id);

create table media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_key text not null,
  thumb_key text,
  mime text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  original_name text not null default '',
  -- Видео перекодируется в фоне в H.264 1080p: его тянут даже дешёвые Android-приставки.
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);
create index media_org_idx on media (org_id, created_at desc);

create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  name_secondary text not null default '',
  compliance text not null default 'none' check (compliance in ('none', 'tobacco')),
  variant_labels text[] not null default '{}',
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index categories_org_idx on categories (org_id, sort);

create table items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  name text not null,
  name_secondary text not null default '',
  description text not null default '',
  portion text not null default '',
  price integer check (price >= 0),
  variants jsonb not null default '[]',
  badges text[] not null default '{}',
  image_id uuid references media (id) on delete set null,
  sold_out boolean not null default false,
  hidden boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_org_idx on items (org_id);
create index items_category_idx on items (category_id, sort);

-- Стоп-лист и цена конкретной точки сети; null — взять значение позиции.
create table item_location_overrides (
  item_id uuid not null references items (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  sold_out boolean,
  price integer check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, location_id)
);
create index item_overrides_location_idx on item_location_overrides (location_id);

create table scenes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  template text not null,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scenes_org_idx on scenes (org_id, created_at);

create table screens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  name text not null,
  orientation text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  schedule jsonb not null default '{"defaultSceneId": null, "rules": []}',
  -- SHA-256 токена устройства; null — экран отвязан.
  device_token_hash text unique,
  paired_at timestamptz,
  last_seen_at timestamptz,
  last_status jsonb,
  created_at timestamptz not null default now()
);
create index screens_org_idx on screens (org_id);

-- Код на экране нового ТВ. Плеер сам генерирует токен и присылает его; храним только хэш.
create table screen_pairings (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  token_hash text not null unique,
  screen_id uuid references screens (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create unique index screen_pairings_active_code_idx on screen_pairings (code) where screen_id is null;

create table audit_log (
  id bigserial primary key,
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on audit_log (org_id, created_at desc);
