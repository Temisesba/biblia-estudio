-- Agrega el campo de texto libre "Explicación" al contexto de cada capítulo
-- (para escribir la lección/explicación corrida, además de los apartados ya
-- existentes: contexto histórico, resumen, enseñanza central, etc.)

alter table public.contexts add column if not exists explanation text;
