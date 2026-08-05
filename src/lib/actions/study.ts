"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS } from "@/lib/books-meta";
import { slugify } from "@/lib/books-meta";
import { getBookOrderRows } from "@/lib/data/bible";

function chapterPath(bookOrder: number, chapter: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugify(book.name) : bookOrder}/${chapter}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

export async function createHighlight(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number;
  verseEnd: number;
  charStart: number | null;
  charEnd: number | null;
  selectedText: string;
  type: "resaltado" | "subrayado";
  color: string;
}) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("highlights")
    .insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_start: input.verseStart,
      verse_end: input.verseEnd,
      char_start: input.charStart,
      char_end: input.charEnd,
      selected_text: input.selectedText,
      type: input.type,
      color: input.color,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  return data;
}

export async function updateHighlight(
  id: string,
  changes: Partial<{ color: string; type: "resaltado" | "subrayado" }>,
  bookOrder: number,
  chapterNumber: number
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("highlights")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function deleteHighlight(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function createNote(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number | null;
  highlightId: string | null;
  quotedText?: string | null;
  content: string;
  tags?: string[];
}) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_number: input.verseNumber,
      highlight_id: input.highlightId,
      quoted_text: input.quotedText ?? null,
      content: input.content,
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  return data;
}

export async function updateNote(
  id: string,
  content: string,
  bookOrder: number,
  chapterNumber: number,
  tags?: string[]
) {
  const { supabase } = await requireUser();
  const changes: Record<string, unknown> = { content, updated_at: new Date().toISOString() };
  if (tags !== undefined) changes.tags = tags;
  const { error } = await supabase.from("notes").update(changes).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function deleteNote(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function toggleFavorite(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number | null;
  verseEnd: number | null;
  existingId: string | null;
}) {
  const { supabase, userId } = await requireUser();
  if (input.existingId) {
    const { error } = await supabase.from("favorites").delete().eq("id", input.existingId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_start: input.verseStart,
      verse_end: input.verseEnd,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  revalidatePath("/mi-estudio");
}

// Nota: "order" es un parámetro reservado en PostgREST (usado para ORDER BY), así que
// no se puede filtrar con .eq("order", ...) sobre una columna llamada "order" — se trae
// la lista completa (66 filas) y se filtra en JS.
async function resolveBookId(bookOrder: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  if (!book) throw new Error("Libro no encontrado");
  const allBooks = await getBookOrderRows();
  const bookRow = allBooks.find((b) => b.order === bookOrder);
  if (!bookRow) throw new Error("Libro no sembrado en la base de datos");
  return bookRow.id;
}

// "reading_progress" (status/times_read/first_read_at/last_read_at) es un agregado que
// se recalcula por completo desde "reading_events" cada vez que se agrega o quita un
// evento — asi times_read, primera y ultima lectura siempre reflejan los eventos reales.
async function recomputeReadingProgress(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  bookId: number,
  chapterNumber: number
) {
  const { data: events } = await supabase
    .from("reading_events")
    .select("read_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .order("read_at", { ascending: true });
  const rows = events ?? [];
  const timesRead = rows.length;

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      book_id: bookId,
      chapter_number: chapterNumber,
      status: timesRead > 0 ? "terminado" : "pendiente",
      times_read: timesRead,
      first_read_at: rows[0]?.read_at ?? null,
      last_read_at: rows[timesRead - 1]?.read_at ?? null,
    },
    { onConflict: "user_id,book_id,chapter_number" }
  );
  if (error) throw new Error(error.message);
}

// "Leído otra vez": agrega un nuevo evento con fecha y hora de ahora mismo. Tambien se
// usa para la primera lectura (el checkbox "Marcar como leido").
export async function markChapterRead(bookOrder: number, chapterNumber: number) {
  const { supabase, userId } = await requireUser();
  const bookId = await resolveBookId(bookOrder);

  const { error } = await supabase
    .from("reading_events")
    .insert({ user_id: userId, book_id: bookId, chapter_number: chapterNumber });
  if (error) throw new Error(error.message);
  await recomputeReadingProgress(supabase, userId, bookId, chapterNumber);

  // Si este capitulo tambien es un dia de algun plan de lectura en el
  // que el usuario esta inscrito, marcar ese dia como leido tambien.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: enrollments } = await supabase
      .from("reading_plan_enrollments")
      .select("plan_id")
      .eq("user_id", user.id);
    const planIds = (enrollments ?? []).map((e) => e.plan_id as string);
    if (planIds.length > 0) {
      const { data: days } = await supabase
        .from("reading_plan_days")
        .select("plan_id, day_number")
        .eq("book_id", bookId)
        .eq("chapter_number", chapterNumber)
        .in("plan_id", planIds);
      if (days && days.length > 0) {
        await supabase
          .from("reading_plan_progress")
          .upsert(days.map((d) => ({ user_id: user.id, plan_id: d.plan_id as string, day_number: d.day_number as number })));
        for (const d of days) revalidatePath(`/planes/${d.plan_id}`);
      }
    }
  }

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
  revalidatePath("/progreso");
}

// Desmarcar "Leído última vez" borra ese registro de lectura puntual (el mas reciente),
// no solo un estado — si era el unico, el capitulo vuelve a quedar pendiente.
export async function removeLastReadingEvent(bookOrder: number, chapterNumber: number) {
  const { supabase, userId } = await requireUser();
  const bookId = await resolveBookId(bookOrder);

  const { data: last } = await supabase
    .from("reading_events")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .order("read_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const { error } = await supabase.from("reading_events").delete().eq("id", last.id);
    if (error) throw new Error(error.message);
  }
  await recomputeReadingProgress(supabase, userId, bookId, chapterNumber);

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
  revalidatePath("/progreso");
}

// Permite corregir la fecha de "primera lectura" (la que ancla el capitulo en el
// calendario de Progreso). Edita el evento mas antiguo (no solo el agregado en cache),
// para que la proxima vez que se recalcule desde reading_events no se pierda el cambio.
export async function updateReadingProgressDate(bookOrder: number, chapterNumber: number, isoDate: string) {
  const { supabase, userId } = await requireUser();
  const bookId = await resolveBookId(bookOrder);
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha invalida");

  const { data: first } = await supabase
    .from("reading_events")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("chapter_number", chapterNumber)
    .order("read_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (first) {
    const { error } = await supabase
      .from("reading_events")
      .update({ read_at: date.toISOString() })
      .eq("id", first.id);
    if (error) throw new Error(error.message);
  }
  await recomputeReadingProgress(supabase, userId, bookId, chapterNumber);

  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/progreso");
}
