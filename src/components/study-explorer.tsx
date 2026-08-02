"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/books-meta";
import { ReadingCalendar } from "@/components/reading-calendar";
import type { Highlight, Note, Favorite, ReadingProgress } from "@/types/database";
import type { WithBookName } from "@/lib/data/study";
import type { PersonalTaggedVerse } from "@/lib/data/personal-topics";

type Filter = "resaltados" | "subrayados" | "comentarios" | "notas" | "favoritos" | "etiquetas" | "historial";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "resaltados", label: "Resaltados" },
  { id: "subrayados", label: "Subrayados" },
  { id: "comentarios", label: "Comentarios" },
  { id: "notas", label: "Notas generales" },
  { id: "favoritos", label: "Favoritos" },
  { id: "etiquetas", label: "Mis etiquetas" },
  { id: "historial", label: "Historial de lectura" },
];

function href(bookName: string, chapter: number) {
  return `/leer/${slugify(bookName)}/${chapter}`;
}

export function StudyExplorer({
  highlights,
  notes,
  favorites,
  progress,
  personalTags,
}: {
  highlights: (Highlight & WithBookName)[];
  notes: (Note & WithBookName)[];
  favorites: (Favorite & WithBookName)[];
  progress: (ReadingProgress & WithBookName)[];
  personalTags: PersonalTaggedVerse[];
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
            href: href(h.book_name, h.chapter_number),
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
            href: href(h.book_name, h.chapter_number),
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
            href: href(n.book_name, n.chapter_number),
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
            href: href(f.book_name, f.chapter_number),
            title:
              f.verse_start && f.verse_end
                ? `${f.book_name} ${f.chapter_number}:${f.verse_start === f.verse_end ? f.verse_start : `${f.verse_start}-${f.verse_end}`}`
                : `${f.book_name} ${f.chapter_number}`,
            date: f.created_at,
          }))}
        />
      )}

      {filter === "etiquetas" && (
        <ItemList
          empty="Aún no has creado etiquetas personales. Selecciona texto en el lector y usa el botón 🔖."
          items={personalTags.map((t, i) => ({
            key: `${t.href}-${t.verseNumber}-${t.topicName}-${i}`,
            href: t.href,
            title: `${t.bookName} ${t.chapterNumber}:${t.verseNumber}`,
            body: `#${t.topicName}`,
          }))}
        />
      )}

      {filter === "historial" && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-80">
            <ReadingCalendar
              entries={progress.map((p) => ({
                book_name: p.book_name,
                chapter_number: p.chapter_number,
                last_read_at: p.last_read_at,
                href: href(p.book_name, p.chapter_number),
              }))}
            />
          </div>
          <div className="flex-1">
            <ItemList
              empty="Aún no has marcado capítulos como leídos."
              items={progress.map((p) => ({
                key: p.id,
                href: href(p.book_name, p.chapter_number),
                title: `${p.book_name} ${p.chapter_number}`,
                body: `Estado: ${p.status} · Veces leído: ${p.times_read}`,
                date: p.last_read_at ?? p.first_read_at,
              }))}
            />
          </div>
        </div>
      )}
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
