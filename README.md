# Biblia Estudio

Aplicación web responsive para leer y estudiar la Biblia en comunidad: múltiples usuarios,
resaltados y subrayados con colores, comentarios vinculados a texto, favoritos, notas por
capítulo, contexto histórico/teológico editable por administradores, progreso de lectura
(con calendario de "quién leyó qué y cuándo"), planes de lectura e indicadores de avance.

Texto bíblico: **Reina-Valera Antigua 1909** (dominio público).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security) para usuarios, notas, marcaciones, favoritos y progreso
- Google Sheets como repositorio administrativo editable (texto bíblico y contexto de cada capítulo)

## Primeros pasos

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.local.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API).
3. Ejecuta la migración `supabase/migrations/0001_init.sql` en el SQL Editor de Supabase
   (o con `supabase db push` si usas el CLI). Esto crea las tablas, RLS y funciones.

### 2. Sembrar el texto bíblico

```bash
npm install
npm run seed
```

Esto carga los 66 libros, 1189 capítulos y ~31,102 versículos de la Reina-Valera Antigua 1909
(`data/rva1909.json`, `data/books-meta.json`) a Supabase.

### 3. Crear tu primer usuario administrador

1. Corre la app (`npm run dev`) y regístrate normalmente — necesitarás un código de invitación.
   Para el primer usuario, créalo directo en Supabase Auth (Dashboard) o genera un código desde
   el SQL Editor:
   ```sql
   insert into invite_codes (code, max_uses) values ('PRIMER-ADMIN', 1);
   ```
2. Regístrate con ese código en `/registro`.
3. En el SQL Editor, promuévete a administrador:
   ```sql
   update profiles set role = 'admin' where email = 'tu@correo.com';
   ```
4. Desde entonces puedes gestionar usuarios e invitaciones desde `/admin`.

### 4. Levantar la app

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> **Nota (Windows/OneDrive):** si el proyecto vive dentro de una carpeta sincronizada por
> OneDrive, Turbopack puede fallar con un error de "leaves the filesystem root". Por eso
> `npm run dev` usa `--webpack` en vez de Turbopack. Puedes quitar la bandera si mueves el
> proyecto fuera de OneDrive.

## Repositorio administrativo (Google Sheets)

`Biblia_Estudio_Repositorio.xlsx` incluye las hojas Libros, Capitulos, Versiculos, Contextos,
Usuarios, Lecturas, Notas, Marcaciones y Favoritos. Súbelo a Google Drive como Hojas de cálculo
de Google y sigue `docs/apps-script-export.gs` para instalar el menú "Biblia Estudio > Exportar
a Supabase", que sincroniza los cambios de Contextos y Versículos sin tocar código.

Alternativa por línea de comandos (usando URLs de "Publicar en la web" en CSV):

```bash
npm run import:sheets
```

## Estructura

- `src/app/(app)/leer/[book]/[chapter]` — lector con pestañas: Texto, Contexto, Mis notas, Progreso
- `src/app/(app)/mi-estudio` — resaltados, subrayados, comentarios, notas, favoritos, calendario de lectura
- `src/app/(app)/progreso` y `/planes` — indicadores de avance y planes de lectura
- `src/app/(app)/admin` — usuarios, invitaciones, actividad de lectura, guía de importación
- `supabase/migrations/0001_init.sql` — esquema completo con Row Level Security
- `scripts/seed.mjs` — siembra el texto bíblico en Supabase
- `scripts/import-sheets.mjs` — importa Contextos/Versículos desde Google Sheets (CSV)

## Pendiente para producción

- Configurar dominio y desplegar (Vercel recomendado; requiere cuenta del usuario).
- Cargar los contextos reales por capítulo (histórico, enseñanza, oración) — contenido pastoral
  a cargo del equipo, vía la app o el Google Sheets.
- Revisar políticas de privacidad/términos antes de invitar usuarios reales.
