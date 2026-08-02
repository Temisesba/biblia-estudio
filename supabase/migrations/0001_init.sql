-- ============================================================
-- Biblia Estudio - Esquema inicial Supabase (Postgres)
-- ============================================================

-- ---------- Tipos ----------
create type public.user_role as enum ('admin', 'lector');
create type public.user_status as enum ('activo', 'suspendido');
create type public.testament as enum ('AT', 'NT');
create type public.mark_type as enum ('resaltado', 'subrayado');
create type public.reading_status as enum ('pendiente', 'iniciado', 'terminado');

-- ---------- Perfiles (extiende auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'lector',
  status public.user_status not null default 'activo',
  font_size int not null default 16,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now()
);

-- ---------- Contenido bíblico (gestionado por admin, importado desde Sheets) ----------
create table public.books (
  id serial primary key,
  testament public.testament not null,
  name text not null,
  abbr text not null,
  "order" int not null unique,
  chapters_count int not null
);

create table public.chapters (
  id serial primary key,
  book_id int not null references public.books(id) on delete cascade,
  number int not null,
  intro_text text,
  unique (book_id, number)
);

create table public.verses (
  id bigserial primary key,
  book_id int not null references public.books(id) on delete cascade,
  chapter_id int not null references public.chapters(id) on delete cascade,
  chapter_number int not null,
  verse_number int not null,
  text text not null,
  version text not null default 'RVA1909',
  unique (book_id, chapter_number, verse_number, version)
);
create index verses_search_idx on public.verses using gin (to_tsvector('spanish', text));
create index verses_lookup_idx on public.verses (book_id, chapter_number);

create table public.contexts (
  id serial primary key,
  book_id int not null references public.books(id) on delete cascade,
  chapter_number int not null,
  historical_context text,
  summary text,
  explanation text,
  central_teaching text,
  reveals_about_god text,
  reveals_about_humanity text,
  practical_applications text,
  reflection text,
  prayer text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter_number)
);

-- ---------- Notas públicas (tipo "nota de traductor", visibles para todos, solo admin las crea) ----------
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

-- ---------- Temas/etiquetas (ej. duelo, esperanza) asignables a un versículo ----------
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

-- ---------- Códigos de invitación (control de acceso tipo organización) ----------
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles(id),
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Datos privados por usuario ----------
create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id),
  chapter_number int not null,
  verse_start int not null,
  verse_end int not null,
  char_start int, -- offset de inicio dentro del texto del versículo (solo si verse_start = verse_end)
  char_end int,   -- offset de fin; null en ambos = se resalta el/los versículo(s) completo(s)
  selected_text text,
  type public.mark_type not null default 'resaltado',
  color text not null default '#FDE68A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index highlights_user_lookup_idx on public.highlights (user_id, book_id, chapter_number);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id),
  chapter_number int not null,
  verse_number int, -- null = nota general del capítulo
  highlight_id uuid references public.highlights(id) on delete cascade, -- si el comentario está vinculado a una marcación
  quoted_text text, -- texto exacto seleccionado/subrayado al crear el comentario
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_lookup_idx on public.notes (user_id, book_id, chapter_number);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id),
  chapter_number int not null,
  verse_start int,
  verse_end int,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, chapter_number, verse_start, verse_end)
);
create index favorites_user_lookup_idx on public.favorites (user_id, book_id, chapter_number);

-- ---------- Etiquetas personales (privadas, para que cada usuario organice su propia búsqueda) ----------
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

create table public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null references public.books(id),
  chapter_number int not null,
  status public.reading_status not null default 'pendiente',
  times_read int not null default 0,
  first_read_at timestamptz,
  last_read_at timestamptz,
  unique (user_id, book_id, chapter_number)
);
create index reading_progress_user_idx on public.reading_progress (user_id);
create index reading_progress_calendar_idx on public.reading_progress (last_read_at);

-- ---------- Planes de lectura ----------
create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.reading_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  day_number int not null,
  book_id int not null references public.books(id),
  chapter_number int not null,
  unique (plan_id, day_number, book_id, chapter_number)
);

create table public.reading_plan_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

create table public.reading_plan_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  day_number int not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, plan_id, day_number)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.verses enable row level security;
alter table public.contexts enable row level security;
alter table public.public_annotations enable row level security;
alter table public.topics enable row level security;
alter table public.verse_topics enable row level security;
alter table public.invite_codes enable row level security;
alter table public.highlights enable row level security;
alter table public.notes enable row level security;
alter table public.favorites enable row level security;
alter table public.personal_topics enable row level security;
alter table public.personal_verse_topics enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reading_plans enable row level security;
alter table public.reading_plan_days enable row level security;
alter table public.reading_plan_enrollments enable row level security;
alter table public.reading_plan_progress enable row level security;

-- Helper: es admin?
create function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'activo'
  );
$$;

-- profiles: cada quien ve/edita lo suyo; admin ve/edita todo
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- contenido bíblico: lectura para cualquier usuario autenticado, escritura solo admin
-- contenido bíblico: lectura pública (sin sesión) para poder cachearlo con
-- unstable_cache; la escritura sigue restringida a admin
create policy "books_read_all" on public.books for select using (true);
create policy "books_write_admin" on public.books for all using (public.is_admin()) with check (public.is_admin());

create policy "chapters_read_all" on public.chapters for select using (true);
create policy "chapters_write_admin" on public.chapters for all using (public.is_admin()) with check (public.is_admin());

create policy "verses_read_all" on public.verses for select using (true);
create policy "verses_write_admin" on public.verses for all using (public.is_admin()) with check (public.is_admin());

create policy "contexts_read_all" on public.contexts for select using (true);
create policy "contexts_write_admin" on public.contexts for all using (public.is_admin()) with check (public.is_admin());

create policy "public_annotations_read_all" on public.public_annotations for select using (auth.role() = 'authenticated');
create policy "public_annotations_write_admin" on public.public_annotations for all using (public.is_admin()) with check (public.is_admin());

create policy "topics_read_all" on public.topics for select using (auth.role() = 'authenticated');
create policy "topics_write_admin" on public.topics for all using (public.is_admin()) with check (public.is_admin());

create policy "verse_topics_read_all" on public.verse_topics for select using (auth.role() = 'authenticated');
create policy "verse_topics_write_admin" on public.verse_topics for all using (public.is_admin()) with check (public.is_admin());

-- invite_codes: solo admin gestiona; validación de canje se hace vía función security definer
create policy "invite_codes_admin_only" on public.invite_codes for all using (public.is_admin()) with check (public.is_admin());

-- datos privados: cada usuario solo ve/edita lo suyo; admin puede ver todo (soporte/moderación)
create policy "highlights_owner" on public.highlights for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "notes_owner" on public.notes for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "favorites_owner" on public.favorites for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "personal_topics_owner" on public.personal_topics for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "personal_verse_topics_owner" on public.personal_verse_topics for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "reading_progress_owner" on public.reading_progress for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- planes de lectura: catálogo visible a todos, solo admin crea/edita
create policy "reading_plans_read_all" on public.reading_plans for select using (auth.role() = 'authenticated');
create policy "reading_plans_write_admin" on public.reading_plans for all using (public.is_admin()) with check (public.is_admin());

create policy "reading_plan_days_read_all" on public.reading_plan_days for select using (auth.role() = 'authenticated');
create policy "reading_plan_days_write_admin" on public.reading_plan_days for all using (public.is_admin()) with check (public.is_admin());

create policy "reading_plan_enrollments_owner" on public.reading_plan_enrollments for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy "reading_plan_progress_owner" on public.reading_plan_progress for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ============================================================
-- Trigger: crear profile automáticamente al registrarse
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'lector'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Funciones: validar y canjear código de invitación (registro controlado)
-- ============================================================
create function public.validate_invite_code(p_code text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.invite_codes
    where code = p_code
      and active = true
      and uses < max_uses
      and (expires_at is null or expires_at > now())
  );
$$;

create function public.redeem_invite_code(p_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_ok boolean;
begin
  update public.invite_codes
  set uses = uses + 1
  where code = p_code
    and active = true
    and uses < max_uses
    and (expires_at is null or expires_at > now());

  v_ok := found;
  return v_ok;
end;
$$;

grant execute on function public.validate_invite_code(text) to anon, authenticated;
grant execute on function public.redeem_invite_code(text) to authenticated;

-- ============================================================
-- Función: registrar lectura de capítulo (usada por la app)
-- ============================================================
create function public.mark_chapter_read(p_book_id int, p_chapter_number int)
returns public.reading_progress
language plpgsql
security definer
as $$
declare
  result public.reading_progress;
begin
  insert into public.reading_progress (user_id, book_id, chapter_number, status, times_read, first_read_at, last_read_at)
  values (auth.uid(), p_book_id, p_chapter_number, 'terminado', 1, now(), now())
  on conflict (user_id, book_id, chapter_number)
  do update set
    times_read = public.reading_progress.times_read + 1,
    status = 'terminado',
    last_read_at = now()
  returning * into result;
  return result;
end;
$$;
