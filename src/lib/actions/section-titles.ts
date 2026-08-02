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

export async function upsertSectionTitle(input: {
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number;
  title: string;
}) {
  const { supabase, userId } = await requireAdmin();
  const trimmed = input.title.trim();
  if (!trimmed) throw new Error("El título no puede estar vacío");

  const { error } = await supabase.from("section_titles").upsert(
    {
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_number: input.verseNumber,
      title: trimmed,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "book_id,chapter_number,verse_number" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
}

export async function deleteSectionTitle(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("section_titles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
}
