-- Guarda el texto exacto que estaba seleccionado/subrayado al crear un
-- comentario de versículo, para poder mostrarlo después (en vez de solo
-- "Versículo 4").

alter table public.notes add column if not exists quoted_text text;
