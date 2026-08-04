import { notFound } from "next/navigation";
import { slugify } from "@/lib/books-meta";
import {
  resolveBook,
  getChapterVerses,
  getChapterContext,
  getChapterSectionTitles,
  getUserHighlights,
  getUserNotes,
  getUserFavorites,
  getUserChapterProgress,
  getReadChaptersMap,
  getPublicAnnotations,
  getContextHighlights,
  getContextFavorites,
  neighborChapter,
} from "@/lib/data/bible";
import { getCurrentProfile } from "@/lib/data/profile";
import { getAllTopics, getChapterTopics } from "@/lib/data/topics";
import { getAllPersonalTopics, getChapterPersonalTopics } from "@/lib/data/personal-topics";
import { ChapterReader } from "@/components/chapter-reader";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book: bookSlug, chapter } = await params;
  const chapterNumber = Number(chapter);
  const profile = await getCurrentProfile();
  if (!profile) notFound();

  const book = await resolveBook(bookSlug);
  if (!book || !Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapters) {
    notFound();
  }

  const [
    verses,
    context,
    sectionTitles,
    highlights,
    notes,
    favorites,
    progress,
    readChapters,
    publicAnnotations,
    chapterTopics,
    allTopics,
    chapterPersonalTopics,
    allPersonalTopics,
    contextHighlights,
    contextFavorites,
  ] = await Promise.all([
    getChapterVerses(book.id, chapterNumber),
    getChapterContext(book.id, chapterNumber),
    getChapterSectionTitles(book.id, chapterNumber),
    getUserHighlights(profile.id, book.id, chapterNumber),
    getUserNotes(profile.id, book.id, chapterNumber),
    getUserFavorites(profile.id, book.id, chapterNumber),
    getUserChapterProgress(profile.id, book.id, chapterNumber),
    getReadChaptersMap(profile.id),
    getPublicAnnotations(book.id, chapterNumber),
    getChapterTopics(book.id, chapterNumber),
    getAllTopics(),
    getChapterPersonalTopics(profile.id, book.id, chapterNumber),
    getAllPersonalTopics(profile.id),
    getContextHighlights(profile.id, book.id, chapterNumber),
    getContextFavorites(profile.id, book.id, chapterNumber),
  ]);

  const prev = neighborChapter(book.order, chapterNumber, -1);
  const next = neighborChapter(book.order, chapterNumber, 1);

  if (verses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <h1 className="text-xl font-semibold">
          {book.name} {chapterNumber}
        </h1>
        <p className="max-w-md text-sm text-foreground/60">
          El texto de este capítulo todavía no ha sido importado a la base de datos. Ejecuta el
          script de siembra (seed) para cargar la Reina-Valera Antigua 1909.
        </p>
      </div>
    );
  }

  return (
    <ChapterReader
      // Sin key, React reutiliza la misma instancia de ChapterReader al navegar entre
      // capitulos (mismo patron de ruta), asi que la pestana activa y el "scroll a este
      // versiculo" de la vez anterior se quedaban pegados en vez de resetear con el nuevo
      // capitulo. La key fuerza un remount limpio por cada libro+capitulo.
      key={`${book.id}-${chapterNumber}`}
      bookId={book.id}
      bookOrder={book.order}
      bookName={book.name}
      chapterNumber={chapterNumber}
      verses={verses}
      sectionTitles={sectionTitles}
      highlights={highlights}
      notes={notes}
      favorites={favorites}
      progress={progress}
      readChapters={readChapters}
      publicAnnotations={publicAnnotations}
      chapterTopics={chapterTopics}
      allTopics={allTopics}
      chapterPersonalTopics={chapterPersonalTopics}
      allPersonalTopics={allPersonalTopics}
      context={context}
      contextHighlights={contextHighlights}
      contextFavorites={contextFavorites}
      isAdmin={profile.role === "admin"}
      prevHref={prev ? `/leer/${slugify(prev.book.name)}/${prev.chapter}` : null}
      nextHref={next ? `/leer/${slugify(next.book.name)}/${next.chapter}` : null}
    />
  );
}
