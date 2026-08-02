/**
 * Apps Script para "Biblia_Estudio_Repositorio" (Google Sheets)
 *
 * Instalación:
 * 1. Sube Biblia_Estudio_Repositorio.xlsx a Google Drive y ábrelo como Google Sheets
 *    (Archivo > Guardar como Hojas de cálculo de Google).
 * 2. En el menú: Extensiones > Apps Script. Pega este código en Code.gs.
 * 3. En el editor: Configuración del proyecto > Propiedades del script, agrega:
 *      SUPABASE_URL         = https://xxxx.supabase.co
 *      SUPABASE_SERVICE_KEY = (la Service Role key de tu proyecto Supabase)
 * 4. Guarda y recarga la hoja: aparecerá el menú "Biblia Estudio" con la opción
 *    "Exportar a Supabase". La primera vez pedirá autorización (solo tuya, no de Anthropic).
 *
 * Qué hace: lee las pestañas "Contextos" y "Versiculos" y actualiza (upsert) las
 * tablas equivalentes en Supabase vía su REST API, emparejando por nombre de libro.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Biblia Estudio")
    .addItem("Exportar a Supabase", "exportarASupabase")
    .addToUi();
}

function exportarASupabase() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty("SUPABASE_URL");
  const key = props.getProperty("SUPABASE_SERVICE_KEY");

  if (!url || !key) {
    SpreadsheetApp.getUi().alert(
      "Faltan las propiedades SUPABASE_URL / SUPABASE_SERVICE_KEY. Configúralas en " +
      "Configuración del proyecto > Propiedades del script."
    );
    return;
  }

  const bookIdMap = fetchBookIdMap_(url, key);
  const contextosCount = exportarContextos_(url, key, bookIdMap);
  const versiculosCount = exportarVersiculos_(url, key, bookIdMap);

  SpreadsheetApp.getUi().alert(
    `Exportación completa.\nContextos actualizados: ${contextosCount}\nVersículos actualizados: ${versiculosCount}`
  );
}

function fetchBookIdMap_(url, key) {
  const res = UrlFetchApp.fetch(`${url}/rest/v1/books?select=id,name`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const books = JSON.parse(res.getContentText());
  const map = {};
  books.forEach((b) => (map[b.name.trim().toLowerCase()] = b.id));
  return map;
}

function sheetToObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row.some((v) => v !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function upsert_(url, key, table, rows, onConflict) {
  if (rows.length === 0) return 0;
  const res = UrlFetchApp.fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates",
    },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(`Error al escribir en ${table}: ${res.getContentText()}`);
  }
  return rows.length;
}

function exportarContextos_(url, key, bookIdMap) {
  const rows = sheetToObjects_("Contextos")
    .map((r) => {
      const bookId = bookIdMap[String(r["Libro"]).trim().toLowerCase()];
      if (!bookId || !r["Capitulo"]) return null;
      return {
        book_id: bookId,
        chapter_number: Number(r["Capitulo"]),
        historical_context: r["Contexto_Historico"] || null,
        summary: r["Resumen"] || null,
        explanation: r["Explicacion"] || null,
        central_teaching: r["Ensenanza_Central"] || null,
        reveals_about_god: r["Revela_Dios"] || null,
        reveals_about_humanity: r["Revela_Humano"] || null,
        practical_applications: r["Aplicacion"] || null,
        reflection: r["Reflexion"] || null,
        prayer: r["Oracion"] || null,
      };
    })
    .filter(Boolean);
  return upsert_(url, key, "contexts", rows, "book_id,chapter_number");
}

function exportarVersiculos_(url, key, bookIdMap) {
  const rows = sheetToObjects_("Versiculos")
    .map((r) => {
      const bookId = bookIdMap[String(r["Libro"]).trim().toLowerCase()];
      if (!bookId || !r["Capitulo"] || !r["Numero_Versiculo"] || !r["Texto"]) return null;
      return {
        book_id: bookId,
        chapter_number: Number(r["Capitulo"]),
        verse_number: Number(r["Numero_Versiculo"]),
        text: r["Texto"],
        version: r["Version"] || "RVA1909",
      };
    })
    .filter(Boolean);
  return upsert_(url, key, "verses", rows, "book_id,chapter_number,verse_number,version");
}
