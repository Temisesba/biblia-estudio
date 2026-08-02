import { BOOKS } from "@/lib/books-meta";

// Mapa de abreviaturas comunes en español -> "order" del libro (1-66).
// Las claves ya están normalizadas (sin acentos, sin puntos, sin espacios, minúsculas).
const BOOK_ALIASES: Record<string, number> = {
  gn: 1, gen: 1, genesis: 1,
  ex: 2, exo: 2, exodo: 2,
  lv: 3, lev: 3, levi: 3, levitico: 3,
  nm: 4, num: 4, nu: 4, numeros: 4,
  dt: 5, deut: 5, deuteronomio: 5,
  jos: 6, josue: 6,
  jue: 7, jueces: 7,
  rt: 8, rut: 8,
  "1s": 9, "1sa": 9, "1sam": 9, "1samuel": 9,
  "2s": 10, "2sa": 10, "2sam": 10, "2samuel": 10,
  "1r": 11, "1re": 11, "1rey": 11, "1reyes": 11,
  "2r": 12, "2re": 12, "2rey": 12, "2reyes": 12,
  "1cr": 13, "1cro": 13, "1cronicas": 13,
  "2cr": 14, "2cro": 14, "2cronicas": 14,
  esd: 15, esdras: 15,
  neh: 16, nehemias: 16,
  est: 17, ester: 17,
  job: 18,
  sal: 19, salmo: 19, salmos: 19, ps: 19, psa: 19,
  prov: 20, proverbios: 20,
  ecl: 21, eclesiastes: 21,
  cnt: 22, cant: 22, cantares: 22, cantardeloscantares: 22,
  is: 23, isa: 23, isaias: 23,
  jer: 24, jeremias: 24,
  lam: 25, lamentaciones: 25,
  ez: 26, eze: 26, ezequiel: 26,
  dn: 27, dan: 27, daniel: 27,
  os: 28, ose: 28, oseas: 28,
  jl: 29, joel: 29,
  am: 30, amos: 30,
  abd: 31, abdias: 31,
  jon: 32, jonas: 32,
  miq: 33, miqueas: 33,
  nah: 34, nahum: 34,
  hab: 35, habacuc: 35,
  sof: 36, sofonias: 36,
  hag: 37, hageo: 37,
  zac: 38, zacarias: 38,
  mal: 39, malaquias: 39,
  mt: 40, mat: 40, mateo: 40,
  mc: 41, mar: 41, marcos: 41,
  lc: 42, luc: 42, lucas: 42,
  jn: 43, juan: 43,
  hch: 44, hech: 44, hechos: 44,
  ro: 45, rom: 45, romanos: 45,
  "1co": 46, "1cor": 46, "1corintios": 46,
  "2co": 47, "2cor": 47, "2corintios": 47,
  ga: 48, gal: 48, galatas: 48,
  ef: 49, efe: 49, efesios: 49,
  fil: 50, flp: 50, filipenses: 50,
  col: 51, colosenses: 51,
  "1ts": 52, "1tes": 52, "1tesalonicenses": 52,
  "2ts": 53, "2tes": 53, "2tesalonicenses": 53,
  "1ti": 54, "1tim": 54, "1timoteo": 54,
  "2ti": 55, "2tim": 55, "2timoteo": 55,
  tit: 56, tito: 56,
  flm: 57, flmn: 57, filemon: 57,
  heb: 58, hebreos: 58,
  stg: 59, sant: 59, santiago: 59,
  "1p": 60, "1pe": 60, "1ped": 60, "1pedro": 60,
  "2p": 61, "2pe": 61, "2ped": 61, "2pedro": 61,
  "1jn": 62, "1juan": 62,
  "2jn": 63, "2juan": 63,
  "3jn": 64, "3juan": 64,
  jud: 65, judas: 65,
  ap: 66, apo: 66, apocalipsis: 66,
};

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function chaptersOf(order: number): number {
  return BOOKS.find((b) => b.order === order)?.chapters ?? 0;
}

interface ParsedRef {
  bookOrder: number;
  bookName: string;
  chapterNumber: number;
}

export interface ReadingPlanParseResult {
  refs: ParsedRef[];
  unmatched: string[];
}

const MONTH_HEADERS = new Set([
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre",
]);

// Intenta reconocer un nombre/abreviatura de libro al inicio de un texto.
// Prueba primero con 4 palabras, luego 3, 2, 1 (para libros compuestos
// como "1 Samuel" o "Cantar de los Cantares").
function matchBookAtStart(words: string[]): { order: number; wordsUsed: number } | null {
  for (const wordCount of [4, 3, 2, 1]) {
    if (words.length < wordCount) continue;
    const candidate = normalizeToken(words.slice(0, wordCount).join(" "));
    if (candidate in BOOK_ALIASES) {
      return { order: BOOK_ALIASES[candidate], wordsUsed: wordCount };
    }
  }
  return null;
}

function expandRange(spec: string): number[] {
  // "49-53" -> [49,50,51,52,53]; "68" -> [68]; ignora ":algo" (rango de versículos)
  const clean = spec.split(":")[0].trim();
  const rangeMatch = clean.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const out: number[] = [];
    for (let n = start; n <= end; n++) out.push(n);
    return out;
  }
  const single = clean.match(/^\d+$/);
  return single ? [Number(clean)] : [];
}

interface LineResult {
  refs: ParsedRef[];
  unmatched: string[];
  lastBookOrder: number | null;
}

// Intenta interpretar una línea (ya sin encabezado de mes) como una o más
// referencias bíblicas. No decide por sí sola si hay que quitar un número
// de día — eso lo resuelve el llamador probando con y sin ese prefijo.
function tryParseLine(rawLine: string, initialLastBookOrder: number | null): LineResult {
  const refs: ParsedRef[] = [];
  const unmatched: string[] = [];
  let lastBookOrder = initialLastBookOrder;

  // línea tipo "1 y 2 Tesalonicenses" o "2 Pedro y Judas" o "Colosenses y Filemón"
  // (varios libros completos separados por " y ", sin números de capítulo)
  if (/\by\b/i.test(rawLine) && !/\d+\s*-\s*\d+/.test(rawLine)) {
    const sides = rawLine.split(/\s+y\s+/i);
    let allMatched = true;
    const localRefs: ParsedRef[] = [];
    let carryPrefix = "";
    for (const side of sides) {
      const words = side.trim().split(/\s+/);
      if (/^\d+$/.test(side.trim())) {
        carryPrefix = side.trim();
        continue;
      }
      const fullWords = carryPrefix ? [carryPrefix, ...words] : words;
      const m = matchBookAtStart(fullWords);
      carryPrefix = "";
      if (!m || m.wordsUsed !== fullWords.length) {
        allMatched = false;
        break;
      }
      const total = chaptersOf(m.order);
      const bookMeta = BOOKS.find((b) => b.order === m.order)!;
      for (let c = 1; c <= total; c++) {
        localRefs.push({ bookOrder: m.order, bookName: bookMeta.name, chapterNumber: c });
      }
    }
    if (allMatched && localRefs.length > 0) {
      return { refs: localRefs, unmatched: [], lastBookOrder: localRefs[localRefs.length - 1].bookOrder };
    }
  }

  // segmentos separados por coma: cada uno puede traer su propio libro, o
  // continuar el libro del segmento anterior (ej. "Sal. 1-2, 15, 22-24")
  const segments = rawLine.split(",").map((s) => s.trim()).filter(Boolean);

  for (const segment of segments) {
    const words = segment.split(/\s+/);
    const bookMatch = matchBookAtStart(words);

    let bookOrder: number | null = null;
    let rest: string;

    if (bookMatch) {
      bookOrder = bookMatch.order;
      rest = words.slice(bookMatch.wordsUsed).join(" ").trim();
    } else if (lastBookOrder !== null && /^[\d:\s-]+$/.test(segment)) {
      // segmento sin nombre de libro: continúa el libro anterior (ej. ", 15, 22-24")
      bookOrder = lastBookOrder;
      rest = segment;
    } else {
      unmatched.push(segment);
      continue;
    }

    if (!rest) {
      // libro completo sin capítulo (ej. "Efesios")
      const total = chaptersOf(bookOrder);
      const bookMeta = BOOKS.find((b) => b.order === bookOrder)!;
      for (let c = 1; c <= total; c++) {
        refs.push({ bookOrder, bookName: bookMeta.name, chapterNumber: c });
      }
      lastBookOrder = bookOrder;
      continue;
    }

    const chapters = expandRange(rest);
    if (chapters.length === 0) {
      unmatched.push(segment);
      continue;
    }
    const bookMeta = BOOKS.find((b) => b.order === bookOrder)!;
    for (const c of chapters) {
      refs.push({ bookOrder, bookName: bookMeta.name, chapterNumber: c });
    }
    lastBookOrder = bookOrder;
  }

  return { refs, unmatched, lastBookOrder };
}

export function parseReadingPlanPaste(text: string): ReadingPlanParseResult {
  const refs: ParsedRef[] = [];
  const unmatched: string[] = [];
  let lastBookOrder: number | null = null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const rawLine of lines) {
    if (MONTH_HEADERS.has(normalizeToken(rawLine))) continue;

    // Probamos la línea tal cual (para no comernos el "1"/"2" de libros como
    // "1 Samuel" o "2 Reyes"), y solo si eso no reconoce nada, probamos de
    // nuevo quitando un posible número de día al inicio (ej. "7 Rut" -> "Rut").
    // Se usa el resultado con menos fragmentos sin reconocer.
    const direct = tryParseLine(rawLine, lastBookOrder);
    let result = direct;

    if (direct.unmatched.length > 0) {
      const strippedLine = rawLine.replace(/^\d{1,2}\s+/, "");
      if (strippedLine !== rawLine) {
        const stripped = tryParseLine(strippedLine, lastBookOrder);
        if (stripped.unmatched.length < direct.unmatched.length) {
          result = stripped;
        }
      }
    }

    refs.push(...result.refs);
    unmatched.push(...result.unmatched);
    lastBookOrder = result.lastBookOrder;
  }

  return { refs, unmatched };
}
