/**
 * Apps Script para "Biblia_Estudio_Repositorio" (Google Sheets)
 *
 * Instalación:
 * 1. Sube Biblia_Estudio_Repositorio.xlsx a Google Drive y ábrelo como Google Sheets
 *    (Archivo > Guardar como Hojas de cálculo de Google).
 * 2. En el menú: Extensiones > Apps Script. Pega este código en Code.gs.
 * 3. En el editor: Configuración del proyecto > Propiedades del script, agrega:
 *      SUPABASE_URL         = https://xxxx.supabase.co
 *      SUPABASE_SERVICE_KEY = la Service Role key LEGACY (formato JWT, empieza con "eyJ...").
 *        Usa la pestaña "Legacy API Keys" en Settings > API Keys del dashboard de Supabase,
 *        NO la nueva "secret key" (sb_secret_...): esa se bloquea con 401 "Forbidden use of
 *        secret API key in browser" porque Apps Script no permite personalizar el header
 *        User-Agent de UrlFetchApp (Google lo ignora), y ese chequeo de Supabase solo mira
 *        el User-Agent de la petición.
 * 4. Guarda y recarga la hoja: aparecerá el menú "Biblia Estudio" con la opción
 *    "Exportar a Supabase". La primera vez pedirá autorización (solo tuya, no de Anthropic).
 *
 * Qué hace: lee las pestañas "Contextos" y "Versiculos" y actualiza (upsert) las
 * tablas equivalentes en Supabase vía su REST API, emparejando por nombre de libro.
 *
 * Exportación selectiva: si agregas una columna de casilla de verificación llamada
 * "Exportar" en "Contextos" y/o "Versiculos" (Insertar > Casilla de verificación), el
 * script solo sincroniza las filas marcadas y las desmarca solo al terminar con éxito.
 * Si esa columna no existe, se sincroniza la hoja completa (como en la primera vez).
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
  const chapterIdMap = fetchChapterIdMap_(url, key);
  const contextosCount = exportarContextos_(url, key, bookIdMap);
  const versiculosCount = exportarVersiculos_(url, key, bookIdMap, chapterIdMap);

  SpreadsheetApp.getUi().alert(
    `Exportación completa.\nContextos actualizados: ${contextosCount}\nVersículos actualizados: ${versiculosCount}`
  );
}

const SUPABASE_HEADERS_ = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
});

function fetchBookIdMap_(url, key) {
  const res = UrlFetchApp.fetch(`${url}/rest/v1/books?select=id,name`, {
    headers: SUPABASE_HEADERS_(key),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(`Error al leer books: ${res.getContentText()}`);
  }
  const books = JSON.parse(res.getContentText());
  const map = {};
  books.forEach((b) => (map[b.name.trim().toLowerCase()] = b.id));
  return map;
}

// "verses.chapter_id" es NOT NULL (FK a chapters). Los capítulos ya existen en Supabase
// (los siembra `npm run seed`), así que solo hace falta resolver su id por book_id+number.
// Se pide con Range para traer los ~1189 capítulos completos aunque supere el límite
// default de 1000 filas de PostgREST.
function fetchChapterIdMap_(url, key) {
  const res = UrlFetchApp.fetch(`${url}/rest/v1/chapters?select=id,book_id,number`, {
    headers: Object.assign({ Range: "0-1999" }, SUPABASE_HEADERS_(key)),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(`Error al leer chapters: ${res.getContentText()}`);
  }
  const chapters = JSON.parse(res.getContentText());
  const map = {};
  chapters.forEach((c) => (map[`${c.book_id}|${c.number}`] = c.id));
  return map;
}

// Nombre de la columna de casilla que marca qué filas hay que sincronizar. Si la hoja no
// tiene esta columna, se exporta todo (comportamiento de la primera sincronización completa).
const MARCA_COLUMNA_ = "Exportar";

function sheetToObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1)
    .map((row, i) => ({ row, sheetRow: i + 2 }))
    .filter(({ row }) => row.some((v) => v !== ""))
    .map(({ row, sheetRow }) => {
      const obj = { _row: sheetRow };
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

// Si la hoja tiene columna "Exportar", deja solo las filas marcadas; si no existe, no filtra
// (para no romper la primera exportación completa antes de agregar la columna).
function filtrarMarcadas_(rows) {
  if (rows.length === 0 || !Object.prototype.hasOwnProperty.call(rows[0], MARCA_COLUMNA_)) {
    return rows;
  }
  return rows.filter((r) => r[MARCA_COLUMNA_] === true);
}

// Desmarca la casilla "Exportar" de las filas que se acaban de sincronizar con éxito, para
// que la próxima corrida no vuelva a mandarlas. No hace nada si la hoja no tiene esa columna.
function desmarcarFilas_(sheetName, sheetRows) {
  if (sheetRows.length === 0) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.indexOf(MARCA_COLUMNA_);
  if (colIndex === -1) return;

  const minRow = Math.min.apply(null, sheetRows);
  const maxRow = Math.max.apply(null, sheetRows);
  const range = sheet.getRange(minRow, colIndex + 1, maxRow - minRow + 1, 1);
  const values = range.getValues();
  sheetRows.forEach((r) => (values[r - minRow][0] = false));
  range.setValues(values);
}

// Un solo POST con miles de filas (p.ej. los ~31,102 versículos completos) puede exceder
// el tiempo de espera de UrlFetchApp y hacer que Apps Script falle con DEADLINE_EXCEEDED.
// Por eso se envía en lotes pequeños y secuenciales.
const UPSERT_BATCH_SIZE = 300;

function upsert_(url, key, table, rows, onConflict) {
  if (rows.length === 0) return 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const res = UrlFetchApp.fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "post",
      contentType: "application/json",
      headers: Object.assign({ Prefer: "resolution=merge-duplicates" }, SUPABASE_HEADERS_(key)),
      payload: JSON.stringify(batch),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() >= 300) {
      throw new Error(
        `Error al escribir en ${table} (filas ${i + 1}-${i + batch.length}): ${res.getContentText()}`
      );
    }
  }
  return rows.length;
}

function exportarContextos_(url, key, bookIdMap) {
  const seleccionadas = filtrarMarcadas_(sheetToObjects_("Contextos"));
  const sheetRows = [];
  const rows = seleccionadas
    .map((r) => {
      const bookId = bookIdMap[String(r["Libro"]).trim().toLowerCase()];
      if (!bookId || !r["Capitulo"]) return null;
      sheetRows.push(r._row);
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
  const count = upsert_(url, key, "contexts", rows, "book_id,chapter_number");
  desmarcarFilas_("Contextos", sheetRows);
  return count;
}

function exportarVersiculos_(url, key, bookIdMap, chapterIdMap) {
  const seleccionadas = filtrarMarcadas_(sheetToObjects_("Versiculos"));
  const sheetRows = [];
  const rows = seleccionadas
    .map((r) => {
      const bookId = bookIdMap[String(r["Libro"]).trim().toLowerCase()];
      if (!bookId || !r["Capitulo"] || !r["Numero_Versiculo"] || !r["Texto"]) return null;
      const chapterNumber = Number(r["Capitulo"]);
      const chapterId = chapterIdMap[`${bookId}|${chapterNumber}`];
      if (!chapterId) return null;
      sheetRows.push(r._row);
      return {
        book_id: bookId,
        chapter_id: chapterId,
        chapter_number: chapterNumber,
        verse_number: Number(r["Numero_Versiculo"]),
        text: r["Texto"],
        version: r["Version"] || "RVA1909",
      };
    })
    .filter(Boolean);
  const count = upsert_(url, key, "verses", rows, "book_id,chapter_number,verse_number,version");
  desmarcarFilas_("Versiculos", sheetRows);
  return count;
}
