-- Forja: esquema de la nube opcional. La app es local-first; la nube solo guarda una copia para
-- sincronizar dispositivos. Nunca se sincronizan datos de salud (lesiones, molestias, medidas)
-- ni las notas de las sesiones; los planes tampoco (se regeneran en cada dispositivo).
-- Seguridad: RLS en todas las tablas; cada persona solo ve y modifica sus propias filas.

-- Copia sincronizada de los registros de la app (un documento JSON por registro).
create table public.sync_rows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null
    check (collection in ('profile', 'sessions', 'achievements')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null check (pg_column_size(data) < 200000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

create index sync_rows_pull on public.sync_rows (user_id, updated_at);

-- La hora de modificación la pone siempre el servidor (reloj único para las descargas).
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sync_rows_touch before insert or update on public.sync_rows
for each row execute function public.touch_updated_at();

alter table public.sync_rows enable row level security;

create policy "Leer mis filas" on public.sync_rows
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis filas" on public.sync_rows
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Actualizar mis filas" on public.sync_rows
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis filas" on public.sync_rows
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Uso diario del asistente en la nube (lo escribe solo la función del servidor).
create table public.assistant_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.assistant_usage enable row level security;

create policy "Leer mi uso" on public.assistant_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Suma una pregunta de forma atómica y devuelve el total del día (solo para el servidor).
create function public.consume_assistant_quota(p_user uuid, p_limit integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  used integer;
begin
  insert into public.assistant_usage as u (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning count into used;
  if used > p_limit then
    update public.assistant_usage set count = count - 1
    where user_id = p_user and day = current_date;
  end if;
  return used;
end;
$$;

revoke all on function public.consume_assistant_quota(uuid, integer) from public, anon, authenticated;

-- Derechos premium (arquitectura preparada; hoy no hay pagos y todo el mundo es «free»).
-- Solo el servidor (p. ej. un webhook de pagos futuro) puede escribir aquí.
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  source text,
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "Leer mis derechos" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);
