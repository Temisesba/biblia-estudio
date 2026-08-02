"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS } from "@/lib/books-meta";
import { slugify } from "@/lib/books-meta";

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
  content: string;
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
      content: input.content,
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
  chapterNumber: number
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
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

export async function markChapterRead(bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const book = BOOKS.find((b) => b.order === bookOrder);
  if (!book) throw new Error("Libro no encontrado");

  const { data: bookRow } = await supabase
    .from("books")
    .select("id")
    .eq("order", bookOrder)
    .single();
  if (!bookRow) throw new Error("Libro no sembrado en la base de datos");

  const { error } = await supabase.rpc("mark_chapter_read", {
    p_book_id: bookRow.id,
    p_chapter_number: chapterNumber,
  });
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
  revalidatePath("/progreso");
}
