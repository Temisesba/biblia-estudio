"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookPicker } from "@/components/book-picker";
import { VerseList } from "@/components/verse-list";
import { ContextPanel } from "@/components/context-panel";
import { ChapterNotesPanel } from "@/components/chapter-notes-panel";
import { ChapterProgressPanel } from "@/components/chapter-progress-panel";
import type {
  Verse,
  Highlight,
  Note,
  Favorite,
  ReadingProgress,
  ChapterContext,
  PublicAnnotation,
} from "@/types/database";

type Tab = "texto" | "contexto" | "notas" | "progreso";

const TABS: { id: Tab; label: string }[] = [
  { id: "texto", label: "Texto bíblico" },
  { id: "contexto", label: "Contexto y explicación" },
  { id: "notas", label: "Mis notas" },
  { id: "progreso", label: "Progreso de lectura" },
];

export function ChapterReader(props: {
  bookId: number;
  bookOrder: number;
  bookName: string;
  chapterNumber: number;
  verses: Verse[];
  highlights: Highlight[];
  notes: Note[];
  favorites: Favorite[];
  progress: ReadingProgress | null;
  readChapters: Record<number, number[]>;
  publicAnnotations: PublicAnnotation[];
  context: ChapterContext | null;
  isAdmin: boolean;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const [tab, setTab] = useState<Tab>("texto");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookPicker
            currentOrder={props.bookOrder}
            currentChapter={props.chapterNumber}
            readChapters={props.readChapters}
          />
          <h1 className="text-xl font-semibold">
            {props.bookName} {props.chapterNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          {props.prevHref ? (
            <Link href={props.prevHref} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              <ChevronLeft size={16} /> Anterior
            </Link>
          ) : (
            <span />
          )}
          {props.nextHref && (
            <Link href={props.nextHref} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              Siguiente <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "texto" && (
        <VerseList
          verses={props.verses}
          bookId={props.bookId}
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          highlights={props.highlights}
          favorites={props.favorites}
          notes={props.notes}
          publicAnnotations={props.publicAnnotations}
          isAdmin={props.isAdmin}
          onJumpToNotes={() => setTab("notas")}
        />
      )}
      {tab === "contexto" && (
        <ContextPanel
          bookId={props.bookId}
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          context={props.context}
          isAdmin={props.isAdmin}
        />
      )}
      {tab === "notas" && (
        <ChapterNotesPanel
          bookId={props.bookId}
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          notes={props.notes}
          highlights={props.highlights}
        />
      )}
      {tab === "progreso" && (
        <ChapterProgressPanel
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          progress={props.progress}
        />
      )}
    </div>
  );
}
