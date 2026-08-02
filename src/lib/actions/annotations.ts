"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify } from "@/lib/books-meta";

function chapterPath(bookOrder: number, chapterNumber: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugify(book.name) : bookOrder}/${chapterNumber}`;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("No autorizado");
  return { supabase, userId: user.id };
}

export async function createPublicAnnotation(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number;
  charStart: number;
  charEnd: number;
  quotedText: string;
  note: string;
}) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("public_annotations").insert({
    book_id: input.bookId,
    chapter_number: input.chapterNumber,
    verse_number: input.verseNumber,
    char_start: input.charStart,
    char_end: input.charEnd,
    quoted_text: input.quotedText,
    note: input.note,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
}

export async function updatePublicAnnotation(
  id: string,
  note: string,
  bookOrder: number,
  chapterNumber: number
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("public_annotations")
    .update({ note, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function deletePublicAnnotation(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("public_annotations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}
