-- =============================================================================
-- Esquema base: profiles, plans, check_ins, ratings, comments.
--
-- * RLS activado en todas las tablas.
-- * Privilegios otorgados de forma explícita: los proyectos nuevos de Supabase
--   ya no exponen las tablas a la Data API por defecto.
-- * La app exige sesión iniciada: el rol `anon` no tiene acceso a nada.
-- =============================================================================

create extension if not exists postgis with schema extensions;

-- Esquema para funciones internas. No está expuesto en la Data API.
create schema if not exists private;
revoke all on schema private from public;


-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles: un registro por usuario de auth, creado automáticamente al registrarse
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil al registrarse. El nombre viene del proveedor (p. ej. Google)
-- o, con magic link, de la parte local del email. Solo es un valor de display:
-- nunca usar user_metadata para decisiones de autorización.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Usuario'
    ), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- -----------------------------------------------------------------------------
-- plans: el catálogo curado
-- -----------------------------------------------------------------------------

create type public.plan_category as enum (
  'gastronomia',
  'cafes',
  'cultura',
  'naturaleza',
  'vida_nocturna',
  'experiencias'
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category public.plan_category not null,
  neighborhood text,
  address text,
  -- Al curar planes solo se llenan lat/lng; `location` se calcula sola.
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography(point, 4326)
  ) stored,
  image_urls text[] not null default '{}',
  -- Mantenidos por el trigger de ratings. No editarlos a mano.
  rating_avg numeric(3, 1),
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- check_ins: solo se crean con la RPC public.check_in() (ver siguiente migración)
-- -----------------------------------------------------------------------------

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  photo_path text not null,
  location extensions.geography(point, 4326) not null,
  distance_m real not null,
  created_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create index check_ins_plan_id_idx on public.check_ins (plan_id);


-- -----------------------------------------------------------------------------
-- ratings: 1–10, uno por usuario y plan
-- -----------------------------------------------------------------------------

create table public.ratings (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);

create index ratings_plan_id_idx on public.ratings (plan_id);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function private.set_updated_at();

-- Recalcula plans.rating_avg / rating_count. Security definer porque los
-- usuarios no tienen permiso para modificar plans.
create function private.sync_plan_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.plans p
  set
    rating_avg = (select round(avg(r.score), 1) from public.ratings r where r.plan_id = p.id),
    rating_count = (select count(*) from public.ratings r where r.plan_id = p.id)
  where p.id in (old.plan_id, new.plan_id);
  return null;
end;
$$;

create trigger ratings_sync_plan_rating
  after insert or update or delete on public.ratings
  for each row execute function private.sync_plan_rating();


-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_plan_id_created_at_idx on public.comments (plan_id, created_at desc);
create index comments_user_id_idx on public.comments (user_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- Privilegios (qué tablas puede tocar cada rol vía Data API)
-- -----------------------------------------------------------------------------

revoke all on public.profiles, public.plans, public.check_ins, public.ratings, public.comments
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select on public.plans to authenticated;
grant select on public.check_ins to authenticated; -- sin insert: solo vía RPC check_in()
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

grant all on public.profiles, public.plans, public.check_ins, public.ratings, public.comments
  to service_role;

-- Postgres da EXECUTE a PUBLIC en toda función nueva; las internas no lo necesitan.
revoke execute on function
  private.set_updated_at(),
  private.handle_new_user(),
  private.sync_plan_rating()
  from public;


-- -----------------------------------------------------------------------------
-- RLS (qué filas)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.check_ins enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;

-- profiles
create policy "profiles: signed-in users can read"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: users update their own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- plans
create policy "plans: signed-in users can read"
  on public.plans for select to authenticated
  using (true);

-- check_ins: cada usuario ve solo los suyos (incluyen su ubicación)
create policy "check_ins: users read their own"
  on public.check_ins for select to authenticated
  using ((select auth.uid()) = user_id);

-- ratings: públicas para usuarios con sesión; escribir requiere check-in previo
create policy "ratings: signed-in users can read"
  on public.ratings for select to authenticated
  using (true);

create policy "ratings: users rate plans they checked in to"
  on public.ratings for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.check_ins c
      where c.user_id = (select auth.uid()) and c.plan_id = ratings.plan_id
    )
  );

create policy "ratings: users update their own"
  on public.ratings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.check_ins c
      where c.user_id = (select auth.uid()) and c.plan_id = ratings.plan_id
    )
  );

create policy "ratings: users delete their own"
  on public.ratings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- comments: públicos para usuarios con sesión; escribir requiere check-in previo
create policy "comments: signed-in users can read"
  on public.comments for select to authenticated
  using (true);

create policy "comments: users comment on plans they checked in to"
  on public.comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.check_ins c
      where c.user_id = (select auth.uid()) and c.plan_id = comments.plan_id
    )
  );

create policy "comments: users update their own"
  on public.comments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "comments: users delete their own"
  on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);
