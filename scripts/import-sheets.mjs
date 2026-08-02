// Importa cambios editados en Google Sheets (Contextos y Versículos) hacia Supabase,
// sin usar la API de Google: lee los CSV publicados de cada hoja ("Archivo > Compartir >
// Publicar en la web" en Google Sheets, formato CSV, una URL por pestaña).
//
// Uso: node scripts/import-sheets.mjs
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SHEETS_CONTEXTOS_CSV_URL, SHEETS_VERSICULOS_CSV_URL (opcionales, se omite lo que falte)

import { createClient } from "@supabase/supabase-js";
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), r[idx] ?? ""])));
}

async function fetchCsv(sheetUrl) {
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`No se pudo descargar ${sheetUrl}: ${res.status}`);
  return parseCsv(await res.text());
}

async function importContextos() {
  const csvUrl = process.env.SHEETS_CONTEXTOS_CSV_URL;
  if (!csvUrl) return console.log("SHEETS_CONTEXTOS_CSV_URL no configurada, se omite Contextos.");

  const rows = await fetchCsv(csvUrl);
  const { data: books } = await supabase.from("books").select("id, order, name");
  const nameToId = new Map(books.map((b) => [b.name.toLowerCase(), b.id]));

  let count = 0;
  for (const row of rows) {
    const bookId = nameToId.get((row.libro ?? "").trim().toLowerCase());
    const chapterNumber = Number(row.capitulo);
    if (!bookId || !chapterNumber) continue;

    const { error } = await supabase.from("contexts").upsert(
      {
        book_id: bookId,
        chapter_number: chapterNumber,
        historical_context: row.contexto_historico || null,
        summary: row.resumen || null,
        explanation: row.explicacion || null,
        central_teaching: row.ensenanza_central || null,
        reveals_about_god: row.revela_dios || null,
        reveals_about_humanity: row.revela_humano || null,
        practical_applications: row.aplicacion || null,
        reflection: row.reflexion || null,
        prayer: row.oracion || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,chapter_number" }
    );
    if (error) console.error(`Error en ${row.libro} ${row.capitulo}:`, error.message);
    else count++;
  }
  console.log(`✓ Contextos importados: ${count}`);
}

async function importVersiculos() {
  const csvUrl = process.env.SHEETS_VERSICULOS_CSV_URL;
  if (!csvUrl) return console.log("SHEETS_VERSICULOS_CSV_URL no configurada, se omite Versículos.");

  const rows = await fetchCsv(csvUrl);
  const { data: books } = await supabase.from("books").select("id, order, name");
  const nameToId = new Map(books.map((b) => [b.name.toLowerCase(), b.id]));

  const batch = [];
  for (const row of rows) {
    const bookId = nameToId.get((row.libro ?? "").trim().toLowerCase());
    const chapterNumber = Number(row.capitulo);
    const verseNumber = Number(row.versiculo);
    if (!bookId || !chapterNumber || !verseNumber || !row.texto) continue;
    batch.push({
      book_id: bookId,
      chapter_number: chapterNumber,
      verse_number: verseNumber,
      text: row.texto,
      version: row.version || "RVA1909",
    });
  }

  for (let i = 0; i < batch.length; i += 500) {
    const { error } = await supabase
      .from("verses")
      .upsert(batch.slice(i, i + 500), { onConflict: "book_id,chapter_number,verse_number,version" });
    if (error) throw error;
  }
  console.log(`✓ Versículos importados/actualizados: ${batch.length}`);
}

async function main() {
  await importContextos();
  await importVersiculos();
  console.log("Importación desde Sheets completa.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
