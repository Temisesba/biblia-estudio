-- Resaltados/subrayados y favoritos dentro del tab de Contexto. A diferencia de
-- "highlights"/"favorites" (que son por versículo), el Contexto está organizado en
-- secciones de texto libre (Resumen, Enseñanza central, etc.), así que se ubican por
-- "field_key" (el nombre del campo en la tabla contexts) en vez de verse_start/verse_end.

create table public.context_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  field_key text not null,
  char_start int not null,
  char_end int not null,
  selected_text text,
  type public.mark_type not null default 'resaltado',
  color text not null default '#FDE68A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index context_highlights_user_lookup_idx on public.context_highlights (user_id, book_id, chapter_number);

create table public.context_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  field_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, chapter_number, field_key)
);
create index context_favorites_user_lookup_idx on public.context_favorites (user_id, book_id, chapter_number);

alter table public.context_highlights enable row level security;
alter table public.context_favorites enable row level security;

create policy "context_highlights_owner" on public.context_highlights for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "context_favorites_owner" on public.context_favorites for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- Etiquetas libres en notas: cada usuario puede marcar sus notas/comentarios con
-- palabras propias (ej. "oracion", "familia") para filtrarlas después en "Mi estudio".
alter table public.notes add column tags text[] not null default '{}';

-- "Área de mejoras" del panel de admin: bitácora simple de ideas/pendientes de la app,
-- solo visible/editable por administradores.
create table public.admin_improvement_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.admin_improvement_notes enable row level security;

create policy "admin_improvement_notes_admin_only" on public.admin_improvement_notes for all
  using (public.is_admin()) with check (public.is_admin());
