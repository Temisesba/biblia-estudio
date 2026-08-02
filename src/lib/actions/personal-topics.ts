"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify as slugifyBookName } from "@/lib/books-meta";

function chapterPath(bookOrder: number, chapterNumber: number) {
  const book = BOOKS.find((b) => b.order === bookOrder);
  return `/leer/${book ? slugifyBookName(book.name) : bookOrder}/${chapterNumber}`;
}

function slugifyTopic(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

export async function getOrCreatePersonalTopic(name: string) {
  const { supabase, userId } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre de la etiqueta no puede estar vacío");
  const slug = slugifyTopic(trimmed);

  const { data: existing } = await supabase
    .from("personal_topics")
    .select("*")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("personal_topics")
    .insert({ user_id: userId, name: trimmed, slug })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function tagVersesPersonal(input: {
  personalTopicId: string;
  bookId: number;
  bookOrder: number;
  chapterNumber: number;
  verseStart: number;
  verseEnd: number;
}) {
  const { supabase, userId } = await requireUser();
  const rows = [];
  for (let v = input.verseStart; v <= input.verseEnd; v++) {
    rows.push({
      personal_topic_id: input.personalTopicId,
      user_id: userId,
      book_id: input.bookId,
      chapter_number: input.chapterNumber,
      verse_number: v,
    });
  }
  const { error } = await supabase
    .from("personal_verse_topics")
    .upsert(rows, { onConflict: "personal_topic_id,book_id,chapter_number,verse_number" });
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(input.bookOrder, input.chapterNumber));
  revalidatePath("/mi-estudio");
}

export async function untagVersePersonal(id: string, bookOrder: number, chapterNumber: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("personal_verse_topics").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(chapterPath(bookOrder, chapterNumber));
  revalidatePath("/mi-estudio");
}
