-- Box Alimentazione: pasti componibili (colazione/pranzo/cena/spuntini)
-- con componenti tracciati singolarmente per alimentare le statistiche.

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('colazione', 'pranzo', 'cena', 'spuntino_mattina', 'spuntino_pomeriggio')),
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table meals enable row level security;

create policy "meals_select_own" on meals for select using (auth.uid() = user_id);
create policy "meals_insert_own" on meals for insert with check (auth.uid() = user_id);
create policy "meals_delete_own" on meals for delete using (auth.uid() = user_id);

create index if not exists meals_user_date_idx on meals (user_id, date);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null,
  ingredient_id text not null,
  name text not null,
  grams numeric not null,
  unit_label text,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0
);

alter table meal_items enable row level security;

create policy "meal_items_select_own" on meal_items for select using (auth.uid() = user_id);
create policy "meal_items_insert_own" on meal_items for insert with check (auth.uid() = user_id);
create policy "meal_items_delete_own" on meal_items for delete using (auth.uid() = user_id);

create index if not exists meal_items_user_idx on meal_items (user_id);
create index if not exists meal_items_meal_idx on meal_items (meal_id);

create table if not exists snack_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  items jsonb not null,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table snack_presets enable row level security;

create policy "snack_presets_select_own" on snack_presets for select using (auth.uid() = user_id);
create policy "snack_presets_insert_own" on snack_presets for insert with check (auth.uid() = user_id);
create policy "snack_presets_delete_own" on snack_presets for delete using (auth.uid() = user_id);

-- Target calorico giornaliero, accanto al peso obiettivo già esistente.
alter table profile_settings add column if not exists kcal_target numeric not null default 2000;
