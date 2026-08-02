-- Temas/etiquetas (ej. duelo, esperanza, tristeza) que el admin asigna a un
-- versículo específico, para poder buscar pasajes por tema/emoción.

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.verse_topics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  verse_number int not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (topic_id, book_id, chapter_number, verse_number)
);
create index verse_topics_lookup_idx on public.verse_topics (book_id, chapter_number);
create index verse_topics_topic_idx on public.verse_topics (topic_id);

alter table public.topics enable row level security;
alter table public.verse_topics enable row level security;

create policy "topics_read_all" on public.topics for select using (auth.role() = 'authenticated');
create policy "topics_write_admin" on public.topics for all using (public.is_admin()) with check (public.is_admin());

create policy "verse_topics_read_all" on public.verse_topics for select using (auth.role() = 'authenticated');
create policy "verse_topics_write_admin" on public.verse_topics for all using (public.is_admin()) with check (public.is_admin());
