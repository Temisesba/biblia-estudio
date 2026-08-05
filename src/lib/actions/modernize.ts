"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BOOKS, slugify } from "@/lib/books-meta";
import { getBookOrderRows } from "@/lib/data/bible";

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

function escapeIlike(s: string) {
  return s.replace(/[%_]/g, (m) => `\\${m}`);
}

export interface ModernizationMatch {
  bookId: number;
  bookOrder: number;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  charStart: number;
  charEnd: number;
  quotedText: string;
}

export interface ModernizationPreviewItem {
  oldPhrase: string;
  newPhrase: string;
  matches: ModernizationMatch[];
}

// Busca cada frase antigua en el texto biblico (opcionalmente limitado a un
// libro/capitulo) y devuelve donde aparece, sin modificar nada todavia.
export async function previewModernization(
  pairs: { oldPhrase: string; newPhrase: string }[],
  scope: { bookOrder: number; chapterNumber: number | null } | null
): Promise<ModernizationPreviewItem[]> {
  const { supabase } = await requireAdmin();

  const bookRows = await getBookOrderRows();
  const orderToId = new Map(bookRows.map((r) => [r.order, r.id]));
  const idToOrder = new Map(bookRows.map((r) => [r.id, r.order]));

  const results: ModernizationPreviewItem[] = [];

  for (const pair of pairs) {
    let query = supabase
      .from("verses")
      .select("book_id, chapter_number, verse_number, text")
      .ilike("text", `%${escapeIlike(pair.oldPhrase)}%`)
      .limit(50);

    if (scope) {
      const bookId = orderToId.get(scope.bookOrder);
      if (bookId) {
        query = query.eq("book_id", bookId);
        if (scope.chapterNumber) query = query.eq("chapter_number", scope.chapterNumber);
      }
    }

    const { data } = await query;
    const matches: ModernizationMatch[] = [];
    for (const row of data ?? []) {
      const text = row.text as string;
      const idx = text.toLowerCase().indexOf(pair.oldPhrase.toLowerCase());
      if (idx < 0) continue;
      const order = idToOrder.get(row.book_id as number) ?? 0;
      const bookMeta = BOOKS.find((b) => b.order === order);
      matches.push({
        bookId: row.book_id as number,
        bookOrder: order,
        bookName: bookMeta?.name ?? "—",
        chapterNumber: row.chapter_number as number,
        verseNumber: row.verse_number as number,
        charStart: idx,
        charEnd: idx + pair.oldPhrase.length,
        quotedText: text.slice(idx, idx + pair.oldPhrase.length),
      });
    }

    results.push({ oldPhrase: pair.oldPhrase, newPhrase: pair.newPhrase, matches });
  }

  return results;
}

export async function applyModernization(items: ModernizationPreviewItem[]) {
  const { supabase, userId } = await requireAdmin();

  const chaptersTouched = new Set<string>();
  let created = 0;
  for (const item of items) {
    for (const m of item.matches) {
      const { error } = await supabase.from("public_annotations").insert({
        book_id: m.bookId,
        chapter_number: m.chapterNumber,
        verse_number: m.verseNumber,
        char_start: m.charStart,
        char_end: m.charEnd,
        quoted_text: m.quotedText,
        note: `Equivalente moderno: “${item.newPhrase}”`,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      created++;
      chaptersTouched.add(`${m.bookOrder}:${m.chapterNumber}`);
    }
  }

  for (const key of chaptersTouched) {
    const [bookOrder, chapterNumber] = key.split(":").map(Number);
    const book = BOOKS.find((b) => b.order === bookOrder);
    revalidatePath(`/leer/${book ? slugify(book.name) : bookOrder}/${chapterNumber}`);
  }

  return { created };
}
