-- Titulos y subtitulos de seccion (ej. "La Creacion", "La Caida") que el
-- admin puede agregar dentro de un capitulo, como en las biblias impresas
-- modernas. Se muestran ANTES del versiculo indicado.

create table public.section_titles (
  id uuid primary key default gen_random_uuid(),
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  verse_number int not null,
  title text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter_number, verse_number)
);
create index section_titles_lookup_idx on public.section_titles (book_id, chapter_number);

alter table public.section_titles enable row level security;

create policy "section_titles_read_all" on public.section_titles
  for select using (true);

create policy "section_titles_write_admin" on public.section_titles
  for all using (public.is_admin()) with check (public.is_admin());
