"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify } from "@/lib/books-meta";

function chapterPath(bookOrder: number, chapterNumber: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugify(book.name) : bookOrder}/${chapterNumber}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

export async function createContextHighlight(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  fieldKey: string;
  charStart: number;
  charEnd: number;
  selectedText: string;
  type: "resaltado" | "subrayado";
  color: string;
}) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("context_highlights")
    .insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      field_key: input.fieldKey,
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

export async function deleteContextHighlight(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("context_highlights").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}

export async function toggleContextFavorite(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  fieldKey: string;
  existingId: string | null;
}) {
  const { supabase, userId } = await requireUser();
  if (input.existingId) {
    const { error } = await supabase.from("context_favorites").delete().eq("id", input.existingId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("context_favorites").insert({
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      field_key: input.fieldKey,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
}
