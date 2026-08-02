-- Etiquetas personales: cada usuario puede crear sus propias etiquetas
-- privadas y asignarlas a un versículo, para organizar/buscar su propio
-- estudio. A diferencia de "topics" (públicos, solo admin), estas son
-- privadas por usuario.

create table public.personal_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.personal_verse_topics (
  id uuid primary key default gen_random_uuid(),
  personal_topic_id uuid not null references public.personal_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  verse_number int not null,
  created_at timestamptz not null default now(),
  unique (personal_topic_id, book_id, chapter_number, verse_number)
);
create index personal_verse_topics_lookup_idx on public.personal_verse_topics (user_id, book_id, chapter_number);

alter table public.personal_topics enable row level security;
alter table public.personal_verse_topics enable row level security;

create policy "personal_topics_owner" on public.personal_topics for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "personal_verse_topics_owner" on public.personal_verse_topics for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());
