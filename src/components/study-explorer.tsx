"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/books-meta";
import type { Highlight, Note, Favorite, ContextHighlight, ContextFavorite } from "@/types/database";
import type { WithBookName } from "@/lib/data/study";
import type { PersonalTaggedVerse } from "@/lib/data/personal-topics";
import { contextFieldLabel } from "@/lib/context-fields";

type Filter =
  | "resaltados"
  | "subrayados"
  | "comentarios"
  | "notas"
  | "favoritos"
  | "etiquetas"
  | "notas_etiquetas"
  | "contexto_resaltados"
  | "contexto_favoritos";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "resaltados", label: "Resaltados" },
  { id: "subrayados", label: "Subrayados" },
  { id: "comentarios", label: "Comentarios" },
  { id: "notas", label: "Notas generales" },
  { id: "favoritos", label: "Favoritos" },
  { id: "etiquetas", label: "Mis etiquetas de versículos" },
  { id: "notas_etiquetas", label: "Notas por etiqueta" },
  { id: "contexto_resaltados", label: "Resaltados en Contexto" },
  { id: "contexto_favoritos", label: "Favoritos en Contexto" },
];

function href(bookName: string, chapter: number, verse?: number | null) {
  const base = `/leer/${slugify(bookName)}/${chapter}`;
  return verse ? `${base}?v=${verse}` : base;
}

function contextHref(bookName: string, chapter: number, fieldKey: string) {
  return `/leer/${slugify(bookName)}/${chapter}?tab=contexto&field=${encodeURIComponent(fieldKey)}`;
}

function groupByTag(tags: PersonalTaggedVerse[]): [string, PersonalTaggedVerse[]][] {
  const groups = new Map<string, PersonalTaggedVerse[]>();
  for (const t of tags) {
    const list = groups.get(t.topicName) ?? [];
    list.push(t);
    groups.set(t.topicName, list);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function groupNotesByTag(notes: (Note & WithBookName)[]): [string, (Note & WithBookName)[]][] {
  const groups = new Map<string, (Note & WithBookName)[]>();
  for (const n of notes) {
    for (const tag of n.tags ?? []) {
      const list = groups.get(tag) ?? [];
      list.push(n);
      groups.set(tag, list);
    }
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export function StudyExplorer({
  highlights,
  notes,
  favorites,
  personalTags,
  contextHighlights,
  contextFavorites,
}: {
  highlights: (Highlight & WithBookName)[];
  notes: (Note & WithBookName)[];
  favorites: (Favorite & WithBookName)[];
  personalTags: PersonalTaggedVerse[];
  contextHighlights: (ContextHighlight & WithBookName)[];
  contextFavorites: (ContextFavorite & WithBookName)[];
}) {
  const [filter, setFilter] = useState<Filter>("resaltados");

  const resaltados = highlights.filter((h) => h.type === "resaltado");
  const subrayados = highlights.filter((h) => h.type === "subrayado");
  const comentarios = notes.filter((n) => n.verse_number !== null);
  const generales = notes.filter((n) => n.verse_number === null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "resaltados" && (
        <ItemList
          empty="No tienes versículos resaltados todavía."
          items={resaltados.map((h) => ({
            key: h.id,
            href: href(h.book_name, h.chapter_number, h.verse_start),
            title: `${h.book_name} ${h.chapter_number}:${h.verse_start === h.verse_end ? h.verse_start : `${h.verse_start}-${h.verse_end}`}`,
            body: h.selected_text,
            date: h.created_at,
            color: h.color,
          }))}
        />
      )}

      {filter === "subrayados" && (
        <ItemList
          empty="No tienes versículos subrayados todavía."
          items={subrayados.map((h) => ({
            key: h.id,
            href: href(h.book_name, h.chapter_number, h.verse_start),
            title: `${h.book_name} ${h.chapter_number}:${h.verse_start === h.verse_end ? h.verse_start : `${h.verse_start}-${h.verse_end}`}`,
            body: h.selected_text,
            date: h.created_at,
            color: h.color,
          }))}
        />
      )}

      {filter === "comentarios" && (
        <ItemList
          empty="No has agregado comentarios todavía."
          items={comentarios.map((n) => ({
            key: n.id,
            href: href(n.book_name, n.chapter_number, n.verse_number),
            title: `${n.book_name} ${n.chapter_number}:${n.verse_number}`,
            body: n.quoted_text ? `"${n.quoted_text}" — ${n.content}` : n.content,
            date: n.created_at,
          }))}
        />
      )}

      {filter === "notas" && (
        <ItemList
          empty="No has escrito notas generales de capítulo todavía."
          items={generales.map((n) => ({
            key: n.id,
            href: href(n.book_name, n.chapter_number),
            title: `${n.book_name} ${n.chapter_number}`,
            body: n.content,
            date: n.created_at,
          }))}
        />
      )}

      {filter === "favoritos" && (
        <ItemList
          empty="No tienes favoritos todavía."
          items={favorites.map((f) => ({
            key: f.id,
            href: href(f.book_name, f.chapter_number, f.verse_start),
            title:
              f.verse_start && f.verse_end
                ? `${f.book_name} ${f.chapter_number}:${f.verse_start === f.verse_end ? f.verse_start : `${f.verse_start}-${f.verse_end}`}`
                : `${f.book_name} ${f.chapter_number}`,
            date: f.created_at,
          }))}
        />
      )}

      {filter === "etiquetas" &&
        (personalTags.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Aún no has creado etiquetas personales. Selecciona texto en el lector y usa el botón 🔖.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groupByTag(personalTags).map(([tagName, verses]) => (
              <div key={tagName}>
                <h3 className="mb-2 text-sm font-semibold text-primary">#{tagName}</h3>
                <ItemList
                  empty=""
                  items={verses.map((t, i) => ({
                    key: `${t.href}-${i}`,
                    href: t.href,
                    title: `${t.bookName} ${t.chapterNumber}:${t.verseNumber}`,
                  }))}
                />
              </div>
            ))}
          </div>
        ))}

      {filter === "contexto_resaltados" && (
        <ItemList
          empty="No tienes nada resaltado en Contexto todavía."
          items={contextHighlights.map((h) => ({
            key: h.id,
            href: contextHref(h.book_name, h.chapter_number, h.field_key),
            title: `${h.book_name} ${h.chapter_number} · ${contextFieldLabel(h.field_key)} (Contexto)`,
            body: h.selected_text,
            date: h.created_at,
            color: h.color,
          }))}
        />
      )}

      {filter === "contexto_favoritos" && (
        <ItemList
          empty="No tienes favoritos en Contexto todavía."
          items={contextFavorites.map((f) => ({
            key: f.id,
            href: contextHref(f.book_name, f.chapter_number, f.field_key),
            title: `${f.book_name} ${f.chapter_number} · ${contextFieldLabel(f.field_key)} (Contexto)`,
            date: f.created_at,
          }))}
        />
      )}

      {filter === "notas_etiquetas" &&
        (groupNotesByTag(notes).length === 0 ? (
          <p className="text-sm text-foreground/50">
            Aún no le has puesto etiquetas a tus notas o comentarios. Agrégales una al escribirlos.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groupNotesByTag(notes).map(([tag, tagNotes]) => (
              <div key={tag}>
                <h3 className="mb-2 text-sm font-semibold text-primary">#{tag}</h3>
                <ItemList
                  empty=""
                  items={tagNotes.map((n) => ({
                    key: n.id,
                    href: href(n.book_name, n.chapter_number, n.verse_number),
                    title:
                      n.verse_number !== null
                        ? `${n.book_name} ${n.chapter_number}:${n.verse_number}`
                        : `${n.book_name} ${n.chapter_number}`,
                    body: n.content,
                    date: n.created_at,
                  }))}
                />
              </div>
            ))}
          </div>
        ))}

    </div>
  );
}

interface Item {
  key: string;
  href: string;
  title: string;
  body?: string | null;
  date?: string | null;
  color?: string;
}

function ItemList({ items, empty }: { items: Item[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-foreground/50">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li key={it.key}>
          <Link href={it.href} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted">
            {it.color && (
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: it.color }} />
            )}
            <div className="flex-1">
              <p className="font-medium text-primary">{it.title}</p>
              {it.body && <p className="mt-0.5 text-foreground/70">{it.body}</p>}
            </div>
            {it.date && (
              <span className="shrink-0 text-xs text-foreground/40">
                {new Date(it.date).toLocaleDateString("es-MX")}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
