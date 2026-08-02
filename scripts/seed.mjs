// Siembra Supabase con la metadata de libros y el texto de la Reina-Valera Antigua 1909.
// Uso: node scripts/seed.mjs
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const booksMeta = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "books-meta.json"), "utf-8"));
const bible = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "rva1909.json"), "utf-8"));

async function main() {
  console.log(`Sembrando ${booksMeta.length} libros...`);
  const { error: booksError } = await supabase.from("books").upsert(
    booksMeta.map((b) => ({
      testament: b.testament,
      name: b.name,
      abbr: b.abbr,
      order: b.order,
      chapters_count: b.chapters,
    })),
    { onConflict: "order" }
  );
  if (booksError) throw booksError;

  const { data: bookRows, error: fetchError } = await supabase.from("books").select("id, order");
  if (fetchError) throw fetchError;
  const orderToId = new Map(bookRows.map((r) => [r.order, r.id]));

  for (const book of bible.books) {
    const bookId = orderToId.get(book.order);
    if (!bookId) {
      console.warn(`Sin book_id para orden ${book.order} (${book.name}), se omite`);
      continue;
    }

    const chapterRows = book.chapters.map((c) => ({ book_id: bookId, number: c.number }));
    const { error: chError } = await supabase.from("chapters").upsert(chapterRows, {
      onConflict: "book_id,number",
    });
    if (chError) throw chError;

    const { data: chapterIdRows, error: chFetchError } = await supabase
      .from("chapters")
      .select("id, number")
      .eq("book_id", bookId);
    if (chFetchError) throw chFetchError;
    const numberToChapterId = new Map(chapterIdRows.map((r) => [r.number, r.id]));

    const verseRows = [];
    for (const chapter of book.chapters) {
      const chapterId = numberToChapterId.get(chapter.number);
      for (const verse of chapter.verses) {
        if (!verse.text) continue; // omite los 18 marcadores vacíos del origen
        verseRows.push({
          book_id: bookId,
          chapter_id: chapterId,
          chapter_number: chapter.number,
          verse_number: verse.number,
          text: verse.text,
          version: "RVA1909",
        });
      }
    }

    for (let i = 0; i < verseRows.length; i += 500) {
      const batch = verseRows.slice(i, i + 500);
      const { error: vError } = await supabase
        .from("verses")
        .upsert(batch, { onConflict: "book_id,chapter_number,verse_number,version" });
      if (vError) throw vError;
    }

    console.log(`✓ ${book.name}: ${book.chapters.length} capítulos, ${verseRows.length} versículos`);
  }

  console.log("Siembra completa.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
