-- Notas públicas tipo "nota de traductor": el admin selecciona una palabra o
-- frase de un versículo y agrega una nota que TODOS los usuarios pueden ver
-- (a diferencia de los resaltados/comentarios privados de cada usuario).

create table public.public_annotations (
  id uuid primary key default gen_random_uuid(),
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  verse_number int not null,
  char_start int not null,
  char_end int not null,
  quoted_text text not null,
  note text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index public_annotations_lookup_idx on public.public_annotations (book_id, chapter_number);

alter table public.public_annotations enable row level security;

create policy "public_annotations_read_all" on public.public_annotations
  for select using (auth.role() = 'authenticated');

create policy "public_annotations_write_admin" on public.public_annotations
  for all using (public.is_admin()) with check (public.is_admin());
