-- Antes "reading_progress" solo guardaba agregados (times_read, first_read_at,
-- last_read_at) y no habia forma de saber CUANDO fue cada lectura individual, ni de
-- deshacer "la ultima vez que lo lei" sin perder todo el historial. Esta tabla guarda
-- un evento por cada vez que se marca un capitulo como leido, con fecha y hora exactas.
-- "reading_progress" se sigue usando (lo leen el calendario, resumen de progreso, etc.)
-- pero ahora es un agregado que se recalcula desde aqui, no la fuente de verdad.
create table public.reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  read_at timestamptz not null default now()
);
create index reading_events_lookup_idx on public.reading_events (user_id, book_id, chapter_number, read_at desc);

alter table public.reading_events enable row level security;

create policy "reading_events_owner" on public.reading_events for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- Backfill: no existia un registro por evento antes de esta migracion, asi que se
-- reconstruye lo mejor posible a partir de los agregados ya guardados. Se preservan
-- first_read_at y last_read_at exactos (uno o dos eventos reales); si times_read era
-- mayor a 2, las lecturas intermedias que no se pueden recuperar se rellenan con la
-- fecha de la ultima lectura, para no perder el conteo total.
insert into public.reading_events (user_id, book_id, chapter_number, read_at)
select user_id, book_id, chapter_number, first_read_at
from public.reading_progress
where status = 'terminado' and first_read_at is not null;

insert into public.reading_events (user_id, book_id, chapter_number, read_at)
select user_id, book_id, chapter_number, last_read_at
from public.reading_progress
where status = 'terminado' and last_read_at is not null and last_read_at <> first_read_at;

insert into public.reading_events (user_id, book_id, chapter_number, read_at)
select rp.user_id, rp.book_id, rp.chapter_number, rp.last_read_at
from public.reading_progress rp, generate_series(1, greatest(rp.times_read - 2, 0))
where rp.status = 'terminado' and rp.last_read_at is not null;
