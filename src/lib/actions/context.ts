"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify } from "@/lib/books-meta";
import type { ChapterContext } from "@/types/database";

export async function saveChapterContext(
  bookId: number,
  bookOrder: number,
  chapterNumber: number,
  fields: Omit<ChapterContext, "id" | "book_id" | "chapter_number" | "updated_by" | "updated_at">
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("contexts").upsert(
    {
      book_id: bookId,
      chapter_number: chapterNumber,
      ...fields,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "book_id,chapter_number" }
  );
  if (error) throw new Error(error.message);

  const book = BOOKS.find((b) => b.order === bookOrder);
  revalidatePath(`/leer/${book ? slugify(book.name) : bookOrder}/${chapterNumber}`);
}
