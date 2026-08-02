-- Permite lectura pública (sin sesión) de libros/capítulos/versículos/
-- contexto, necesaria para poder cachear ese contenido con unstable_cache
-- (las funciones cacheadas no pueden depender de la cookie de sesión).
-- La escritura sigue restringida a admin; los datos privados del usuario
-- (notas, resaltados, progreso, favoritos) NO cambian, siguen requiriendo
-- sesión.

drop policy if exists "books_read_all" on public.books;
create policy "books_read_all" on public.books for select using (true);

drop policy if exists "chapters_read_all" on public.chapters;
create policy "chapters_read_all" on public.chapters for select using (true);

drop policy if exists "verses_read_all" on public.verses;
create policy "verses_read_all" on public.verses for select using (true);

drop policy if exists "contexts_read_all" on public.contexts;
create policy "contexts_read_all" on public.contexts for select using (true);
