-- Einrichtung fuer die Rechnungs-App (Supabase -> SQL Editor -> alles einfuegen -> Run)

-- 1) Die Daten jeder Nutzerin / jedes Nutzers als ein Dokument mit Versionsnummer
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null,
  version    bigint      not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

drop policy if exists "eigene Daten lesen"   on public.user_data;
drop policy if exists "eigene Daten anlegen" on public.user_data;
drop policy if exists "eigene Daten aendern" on public.user_data;
create policy "eigene Daten lesen"   on public.user_data for select to authenticated using (user_id = (select auth.uid()));
create policy "eigene Daten anlegen" on public.user_data for insert to authenticated with check (user_id = (select auth.uid()));
create policy "eigene Daten aendern" on public.user_data for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.user_data to authenticated;

-- 2) Archiv der erzeugten Rechnungsdateien: nur anlegen und lesen, nie aendern oder loeschen
create table if not exists public.archive (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  id         text        not null,
  meta       jsonb       not null,
  b64        text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.archive enable row level security;

drop policy if exists "eigenes Archiv lesen"   on public.archive;
drop policy if exists "eigenes Archiv anlegen" on public.archive;
create policy "eigenes Archiv lesen"   on public.archive for select to authenticated using (user_id = (select auth.uid()));
create policy "eigenes Archiv anlegen" on public.archive for insert to authenticated with check (user_id = (select auth.uid()));
grant select, insert on public.archive to authenticated;
-- Absichtlich keine Policy fuer UPDATE/DELETE: archivierte Dateien sind unveraenderbar.

-- 3) Konto selbst loeschen (loescht ueber "on delete cascade" auch alle Daten und das Archiv)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
