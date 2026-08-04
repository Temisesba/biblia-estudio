"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
  Topic,
  PersonalTopic,
  SectionTitle,
  ContextHighlight,
  ContextFavorite,
} from "@/types/database";
import type { ChapterTopicsMap } from "@/lib/data/topics";
import type { ChapterPersonalTopicsMap } from "@/lib/data/personal-topics";

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
  sectionTitles: SectionTitle[];
  highlights: Highlight[];
  notes: Note[];
  favorites: Favorite[];
  progress: ReadingProgress | null;
  readChapters: Record<number, number[]>;
  publicAnnotations: PublicAnnotation[];
  chapterTopics: ChapterTopicsMap;
  allTopics: (Topic & { verseCount: number })[];
  chapterPersonalTopics: ChapterPersonalTopicsMap;
  allPersonalTopics: (PersonalTopic & { verseCount: number })[];
  context: ChapterContext | null;
  contextHighlights: ContextHighlight[];
  contextFavorites: ContextFavorite[];
  isAdmin: boolean;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const [tab, setTab] = useState<Tab>("texto");
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookPicker
            currentOrder={props.bookOrder}
            currentChapter={props.chapterNumber}
            readChapters={props.readChapters}
          />
          <h1 className="flex items-baseline gap-2 text-xl font-semibold">
            {props.bookName} {props.chapterNumber}
            <span className="text-xs font-normal text-foreground/40">Reina-Valera 1909</span>
          </h1>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((o) => !o);
              if (searchOpen) setChapterQuery("");
            }}
            title="Buscar en este capítulo"
            aria-label="Buscar en este capítulo"
            className="rounded-md border border-border p-1.5 hover:bg-muted"
          >
            <Search size={16} />
          </button>
          {searchOpen && (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={chapterQuery}
                onChange={(e) => setChapterQuery(e.target.value)}
                placeholder="Buscar en este capítulo..."
                className="w-40 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary sm:w-56"
              />
              {chapterQuery && (
                <button
                  type="button"
                  onClick={() => setChapterQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="rounded p-1 hover:bg-muted"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
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
          sectionTitles={props.sectionTitles}
          bookId={props.bookId}
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          highlights={props.highlights}
          favorites={props.favorites}
          notes={props.notes}
          publicAnnotations={props.publicAnnotations}
          chapterTopics={props.chapterTopics}
          allTopics={props.allTopics}
          chapterPersonalTopics={props.chapterPersonalTopics}
          allPersonalTopics={props.allPersonalTopics}
          isAdmin={props.isAdmin}
          searchQuery={chapterQuery}
          onJumpToNotes={() => setTab("notas")}
          jumpToVerse={jumpTarget}
          progress={props.progress}
        />
      )}
      {tab === "contexto" && (
        <ContextPanel
          bookId={props.bookId}
          bookOrder={props.bookOrder}
          chapterNumber={props.chapterNumber}
          context={props.context}
          highlights={props.contextHighlights}
          favorites={props.contextFavorites}
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
          chapterPersonalTopics={props.chapterPersonalTopics}
          onJumpToVerse={(v) => {
            setJumpTarget(v);
            setTab("texto");
          }}
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
