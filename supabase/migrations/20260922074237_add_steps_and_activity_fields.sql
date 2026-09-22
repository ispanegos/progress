-- Box Attività: passi giornalieri (un valore per giorno) + tipo/durata
-- sulle attività fisiche, oltre al target passi nelle impostazioni.

create table if not exists step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  steps integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table step_logs enable row level security;

create policy "step_logs_select_own" on step_logs for select using (auth.uid() = user_id);
create policy "step_logs_insert_own" on step_logs for insert with check (auth.uid() = user_id);
create policy "step_logs_update_own" on step_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "step_logs_delete_own" on step_logs for delete using (auth.uid() = user_id);

create index if not exists step_logs_user_date_idx on step_logs (user_id, date);

alter table activity_entries add column if not exists type text;
alter table activity_entries add column if not exists duration_minutes numeric;

alter table profile_settings add column if not exists steps_target numeric not null default 9000;
